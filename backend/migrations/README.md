# Migrations

golang-migrate SQL files, e.g. `000001_init.up.sql` / `000001_init.down.sql`.

The directory is embedded into the `api` binary (`//go:embed migrations` in
`cmd/api/main.go`) and applied on start (migrate-on-start, TECHNICAL_DOC §8).
Schema migrations land from Milestone 1 onward; this README keeps the embed
working in the meantime and is ignored by the migrate driver.