"""Attachment ownership and prompt assembly. Storage is faked; nothing is fetched."""
import base64

import pytest

from app import attachments as att
from tests.conftest import SESSION_A, USER_A, USER_B

OTHER_SESSION = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def ref(path: str, size: int = 100, mime: str = "image/png", name: str = "f.png") -> dict:
    return {"storage_path": path, "size_bytes": size, "mime_type": mime, "file_name": name}


# ── verify_ownership ──────────────────────────────────────────────────────
def test_own_path_passes():
    att.verify_ownership([ref(f"{USER_A}/{SESSION_A}/x.png")], USER_A, SESSION_A)


def test_another_users_path_is_rejected():
    with pytest.raises(att.AttachmentError, match="does not belong"):
        att.verify_ownership([ref(f"{USER_B}/{SESSION_A}/x.png")], USER_A, SESSION_A)


def test_another_sessions_path_is_rejected():
    with pytest.raises(att.AttachmentError, match="does not belong"):
        att.verify_ownership([ref(f"{USER_A}/{OTHER_SESSION}/x.png")], USER_A, SESSION_A)


def test_traversal_shaped_paths_are_rejected():
    for path in ["../../etc/passwd", f"{USER_A}", "", f"{USER_A}/{SESSION_A}"]:
        with pytest.raises(att.AttachmentError):
            att.verify_ownership([ref(path)], USER_A, SESSION_A)


def test_too_many_attachments_rejected():
    refs = [ref(f"{USER_A}/{SESSION_A}/{i}.png") for i in range(att.MAX_ATTACHMENTS_PER_MESSAGE + 1)]
    with pytest.raises(att.AttachmentError, match="at most"):
        att.verify_ownership(refs, USER_A, SESSION_A)


def test_oversize_attachment_rejected():
    big = ref(f"{USER_A}/{SESSION_A}/x.png", size=att.MAX_ATTACHMENT_BYTES + 1)
    with pytest.raises(att.AttachmentError, match="size limit"):
        att.verify_ownership([big], USER_A, SESSION_A)


# ── build_message_content ─────────────────────────────────────────────────
@pytest.fixture
def storage(monkeypatch):
    files: dict[str, bytes] = {}
    monkeypatch.setattr(att, "download", lambda path: files[path])
    return files


def test_images_become_base64_parts(storage):
    storage["p/s/a.png"] = b"\x89PNG"
    entry = att.build_message_content("look", [ref("p/s/a.png", name="a.png")])

    assert entry["role"] == "user"
    assert entry["content"] == "look"
    assert entry["images"] == [
        {"mime": "image/png", "data": base64.b64encode(b"\x89PNG").decode(), "name": "a.png"}
    ]


def test_text_documents_are_inlined_with_markers(storage):
    storage["p/s/n.txt"] = "hello file".encode()
    entry = att.build_message_content("read this", [ref("p/s/n.txt", mime="text/plain", name="n.txt")])

    assert "images" not in entry
    assert entry["content"].startswith("read this\n\n--- attached file: n.txt ---\nhello file")
    assert entry["content"].endswith("--- end of n.txt ---")


def test_long_documents_are_truncated(storage):
    storage["p/s/big.txt"] = ("y" * (att.MAX_DOCUMENT_CHARS + 500)).encode()
    entry = att.build_message_content("", [ref("p/s/big.txt", mime="text/plain", name="big.txt")])

    assert "[... truncated]" in entry["content"]
    assert entry["content"].count("y") == att.MAX_DOCUMENT_CHARS


def test_pdf_is_described_not_decoded(storage):
    storage["p/s/d.pdf"] = b"%PDF-1.7 binary"
    entry = att.build_message_content("", [ref("p/s/d.pdf", mime="application/pdf", name="d.pdf")])

    assert "attached PDF: d.pdf" in entry["content"]
    assert "%PDF" not in entry["content"]


def test_unreadable_object_raises_attachment_error(monkeypatch):
    def boom(path):
        raise att.AttachmentError(f"could not read attachment {path}")

    monkeypatch.setattr(att, "download", boom)
    with pytest.raises(att.AttachmentError, match="could not read"):
        att.build_message_content("x", [ref("p/s/missing.png")])
