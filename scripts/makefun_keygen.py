#!/usr/bin/env python3
"""Create a dedicated Solana keypair for make.fun, stored outside the repo.

Writes a Solana-CLI-compatible JSON keypair (64 bytes: seed + public key)
with 0600 permissions and prints only the public address. If the file
already exists it is left untouched and its address is printed.
"""
import argparse
import json
import os
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
DEFAULT_PATH = "~/.config/makefun/keypair.json"
REPO_ROOT = Path(__file__).resolve().parents[1]


def b58encode(data: bytes) -> str:
    n = int.from_bytes(data, "big")
    out = ""
    while n:
        n, rem = divmod(n, 58)
        out = ALPHABET[rem] + out
    return "1" * (len(data) - len(data.lstrip(b"\0"))) + out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out",
        default=os.environ.get("MAKEFUN_KEYPAIR_PATH", DEFAULT_PATH),
        help=f"keypair file to create (default: {DEFAULT_PATH})",
    )
    out = Path(parser.parse_args().out).expanduser().resolve()

    if out.is_relative_to(REPO_ROOT):
        print(f"refusing to write a keypair inside the repo: {out}", file=sys.stderr)
        return 1

    if out.exists():
        secret = bytes(json.loads(out.read_text()))
        print(f"existing keypair kept: {out}")
        print(f"address: {b58encode(secret[32:])}")
        return 0

    key = Ed25519PrivateKey.generate()
    seed = key.private_bytes(
        serialization.Encoding.Raw,
        serialization.PrivateFormat.Raw,
        serialization.NoEncryption(),
    )
    public = key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )

    out.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as fh:
        json.dump(list(seed + public), fh)

    print(f"new keypair written: {out}")
    print(f"address: {b58encode(public)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
