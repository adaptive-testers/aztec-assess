from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import SignupAllowlist


class Command(BaseCommand):
    help = "Seed SignupAllowlist entries for controlled environment signup."

    def add_arguments(self, parser) -> None:  # type: ignore[no-untyped-def]
        parser.add_argument(
            "--email",
            action="append",
            default=[],
            help="Email to seed. May be passed multiple times or comma-separated.",
        )
        parser.add_argument(
            "--from-file",
            dest="from_file",
            help="Path to a newline-delimited email file. Empty lines and # comments are ignored.",
        )
        parser.add_argument(
            "--role",
            choices=["student", "instructor", "both"],
            default="student",
            help="Allowed signup role(s) for provided emails.",
        )
        parser.add_argument(
            "--inactive",
            action="store_true",
            help="Create/update entries as inactive instead of active.",
        )
        parser.add_argument(
            "--notes",
            default="",
            help="Optional notes saved to each allowlist entry.",
        )

    def handle(self, *_args, **options) -> None:  # type: ignore[no-untyped-def]
        emails = self._collect_emails(
            raw_emails=options["email"],
            from_file=options.get("from_file"),
        )
        if not emails:
            raise CommandError("No emails provided. Use --email and/or --from-file.")

        role = options["role"]
        student_allowed, instructor_allowed = self._role_flags(role)
        is_active = not options["inactive"]
        notes = options["notes"]

        created = 0
        updated = 0
        for email in emails:
            entry, was_created = SignupAllowlist.objects.update_or_create(
                email=email,
                defaults={
                    "student_allowed": student_allowed,
                    "instructor_allowed": instructor_allowed,
                    "is_active": is_active,
                    "notes": notes,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"Created allowlist entry: {entry.email}"))
            else:
                updated += 1
                self.stdout.write(self.style.WARNING(f"Updated allowlist entry: {entry.email}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"Completed seeding allowlist entries. Created={created}, Updated={updated}, Total={len(emails)}"
            )
        )

    def _collect_emails(self, raw_emails: list[str], from_file: str | None) -> list[str]:
        values: set[str] = set()

        for value in raw_emails:
            parts = [part.strip().lower() for part in value.split(",")]
            values.update(part for part in parts if part)

        if from_file:
            path = Path(from_file)
            if not path.exists():
                raise CommandError(f"Email file not found: {from_file}")
            for line in path.read_text(encoding="utf-8").splitlines():
                candidate = line.strip()
                if not candidate or candidate.startswith("#"):
                    continue
                values.add(candidate.lower())

        return sorted(values)

    @staticmethod
    def _role_flags(role: str) -> tuple[bool, bool]:
        if role == "student":
            return True, False
        if role == "instructor":
            return False, True
        return True, True
