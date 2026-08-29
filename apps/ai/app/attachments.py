"""Attachment handling — turns stored files into prompt content.

Images become base64 parts the vision models can read; text documents are
inlined into the message text (truncated so one large file cannot eat the whole
input budget). Bytes are read with the service-role key, so every caller MUST
have already verified that the session belongs to the authenticated user.

The internal message shape stays `{"role", "content"}` for text, with an
optional `"images"` list of `{"mime", "data"}` that `router.py` maps onto each
provider's own multimodal format.
"""
import base64

from .db import db

BUCKET = "attachments"

IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}

# Mirrors packages/shared/attachments.ts — keep the two in step.
MAX_DOCUMENT_CHARS = 12_000
IMAGE_TOKEN_ESTIMATE = 1_100
MAX_ATTACHMENTS_PER_MESSAGE = 4
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024


class AttachmentError(Exception):
    """Raised when an attachment cannot be read or is not acceptable."""


def download(storage_path: str) -> bytes:
    """Fetch an object's bytes from the private attachments bucket."""
    try:
        return db().storage.from_(BUCKET).download(storage_path)
    except Exception as exc:  # network, missing object, permissions
        raise AttachmentError(f"could not read attachment {storage_path}: {exc}") from exc


def _decode_document(raw: bytes, file_name: str, mime_type: str) -> str:
    """Best-effort text extraction, truncated to the document budget."""
    if mime_type == "application/pdf":
        # No PDF text extraction yet — tell the model what it is rather than
        # silently dropping the file or feeding it binary noise.
        return f"[attached PDF: {file_name} — text extraction not supported yet]"

    text = raw.decode("utf-8", errors="replace")
    if len(text) > MAX_DOCUMENT_CHARS:
        text = text[:MAX_DOCUMENT_CHARS] + "\n[... truncated]"
    return f"--- attached file: {file_name} ---\n{text}\n--- end of {file_name} ---"


def verify_ownership(attachments: list[dict], user_id: str, session_id: str) -> None:
    """Reject anything whose storage path is not this user's, or that breaks limits.

    Paths are `{user_id}/{session_id}/{uuid}.{ext}`. A client could otherwise
    name any object here and have the service-role key fetch it for them.
    """
    if len(attachments) > MAX_ATTACHMENTS_PER_MESSAGE:
        raise AttachmentError(
            f"at most {MAX_ATTACHMENTS_PER_MESSAGE} attachments per message"
        )

    for a in attachments:
        path = a.get("storage_path", "")
        segments = path.split("/")
        if len(segments) < 3 or segments[0] != user_id or segments[1] != session_id:
            raise AttachmentError("attachment does not belong to this session")
        if a.get("size_bytes", 0) > MAX_ATTACHMENT_BYTES:
            raise AttachmentError(f"{a.get('file_name', 'file')} is over the size limit")


def build_message_content(message: str, attachments: list[dict]) -> dict:
    """Merge the typed message and its attachments into one context entry.

    Text documents are appended to the message body; images are attached as
    base64 parts. Returns `{"role": "user", "content": str, "images": [...]}`.
    """
    text_parts = [message] if message else []
    images: list[dict] = []

    for a in attachments:
        mime = a.get("mime_type", "")
        name = a.get("file_name", "file")
        raw = download(a["storage_path"])

        if mime in IMAGE_MIME_TYPES:
            images.append(
                {
                    "mime": mime,
                    "data": base64.b64encode(raw).decode("ascii"),
                    "name": name,
                }
            )
        else:
            text_parts.append(_decode_document(raw, name, mime))

    entry: dict = {"role": "user", "content": "\n\n".join(text_parts)}
    if images:
        entry["images"] = images
    return entry


def persist(attachments: list[dict], message_id: str, session_id: str, user_id: str) -> None:
    """Record the attachment rows against the user message they were sent with."""
    if not attachments:
        return
    db().table("attachments").insert(
        [
            {
                "message_id": message_id,
                "session_id": session_id,
                "user_id": user_id,
                "storage_path": a["storage_path"],
                "file_name": a.get("file_name", "file"),
                "mime_type": a.get("mime_type", "application/octet-stream"),
                "size_bytes": a.get("size_bytes", 0),
                "kind": "image" if a.get("mime_type") in IMAGE_MIME_TYPES else "document",
            }
            for a in attachments
        ]
    ).execute()
