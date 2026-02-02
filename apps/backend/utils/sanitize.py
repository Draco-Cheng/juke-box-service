"""Input sanitization utilities for user-provided content."""

import re
import html
from typing import Annotated
from pydantic import AfterValidator


def sanitize_string(value: str | None, max_length: int = 500) -> str | None:
    """
    Sanitize a string by:
    - Stripping whitespace
    - Escaping HTML entities
    - Limiting length
    - Removing control characters
    """
    if value is None:
        return None

    # Strip whitespace
    value = value.strip()

    if not value:
        return None

    # Remove control characters (except newlines and tabs for messages)
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)

    # Escape HTML entities to prevent XSS
    value = html.escape(value)

    # Limit length
    if len(value) > max_length:
        value = value[:max_length]

    return value


def sanitize_message(value: str | None) -> str | None:
    """
    Sanitize a message field (allows newlines, longer content).
    """
    if value is None:
        return None

    # Strip whitespace
    value = value.strip()

    if not value:
        return None

    # Remove dangerous control characters (keep \n and \t)
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)

    # Escape HTML entities
    value = html.escape(value)

    # Limit message length to 1000 chars
    if len(value) > 1000:
        value = value[:1000]

    return value


def _validate_sanitized(value: str | None) -> str | None:
    """Pydantic validator for sanitized strings."""
    return sanitize_string(value)


def _validate_message(value: str | None) -> str | None:
    """Pydantic validator for message fields."""
    return sanitize_message(value)


# Annotated types for Pydantic models
SanitizedStr = Annotated[str | None, AfterValidator(_validate_sanitized)]
SanitizedMessage = Annotated[str | None, AfterValidator(_validate_message)]
