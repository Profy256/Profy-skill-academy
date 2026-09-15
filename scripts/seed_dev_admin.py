#!/usr/bin/env python3
"""Seed a local dev admin user into admin_users (idempotent — upserts by email).

Usage:
  python3 scripts/seed_dev_admin.py [email] [password]

Defaults: admin@profy.test / admin-dev-password
Requires DATABASE_URL-style access; uses the compose Postgres on localhost:5434 by default.
"""
import sys

import psycopg2
import bcrypt

HOST = "localhost"
PORT = 5434
DB = "profy"
USER = "profy"
PASSWORD = "profy"


def main() -> None:
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@profy.test"
    password = sys.argv[2] if len(sys.argv) > 2 else "admin-dev-password"
    name = "Dev Admin"

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()

    conn = psycopg2.connect(host=HOST, port=PORT, dbname=DB, user=USER, password=PASSWORD)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO admin_users (email, password_hash, name, role)
                VALUES (%s, %s, %s, 'admin')
                ON CONFLICT (email) DO UPDATE
                  SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
                RETURNING id
                """,
                (email, password_hash, name),
            )
            row = cur.fetchone()
        admin_id = row[0] if row else None
        print(f"Seeded admin user: {email} (id={admin_id})")
        print(f"Password: {password}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
