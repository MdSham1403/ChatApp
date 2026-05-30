import httpx
import re
from typing import Optional

async def fetch_link_preview(url: str) -> Optional[dict]:
    """Scrape Open Graph tags from a URL."""
    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
            r = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (compatible; ChatAppBot/1.0)"
            })
            if r.status_code != 200:
                return None
            html = r.text

        def og(prop):
            m = re.search(
                rf'<meta[^>]+property=["\']og:{prop}["\'][^>]+content=["\']([^"\']+)["\']',
                html, re.IGNORECASE
            )
            if m: return m.group(1)
            m = re.search(
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:{prop}["\']',
                html, re.IGNORECASE
            )
            return m.group(1) if m else None

        def meta(name):
            m = re.search(
                rf'<meta[^>]+name=["\']{name}["\'][^>]+content=["\']([^"\']+)["\']',
                html, re.IGNORECASE
            )
            return m.group(1) if m else None

        def title_tag():
            m = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
            return m.group(1).strip() if m else None

        title = og("title") or meta("title") or title_tag()
        desc  = og("description") or meta("description")
        image = og("image")
        site  = og("site_name")

        if not title:
            return None

        return {
            "url"         : url,
            "title"       : title[:100],
            "description" : desc[:200] if desc else None,
            "image"       : image,
            "site_name"   : site,
        }
    except Exception:
        return None


URL_PATTERN = re.compile(
    r'https?://[^\s<>"{}|\\^`\[\]]+'
)

def extract_url(text: str) -> Optional[str]:
    m = URL_PATTERN.search(text)
    return m.group(0) if m else None