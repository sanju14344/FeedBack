import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url: str | None = os.environ.get("SUPABASE_URL")

# Use the service role key if provided — it bypasses Row-Level Security (RLS)
# and is required for server-side inserts/selects on protected tables.
# If not set, falls back to the anon key (RLS policies must be configured).
_key: str | None = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

if not _url or not _key:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_ANON_KEY) must be set in .env"
    )

_client: Client = create_client(_url, _key)


def get_supabase() -> Client:
    """Return the shared Supabase client instance."""
    return _client
