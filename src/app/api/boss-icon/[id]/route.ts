import { getClientCredentialsToken } from "@/lib/blizzard-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache URL lookups in memory to avoid repeated API calls per process lifetime
const urlCache = new Map<string, string | null>();

async function getBossPortraitUrl(id: string, region = "eu"): Promise<string | null> {
  const cacheKey = `${region}:${id}`;
  if (urlCache.has(cacheKey)) return urlCache.get(cacheKey)!;

  try {
    const token = await getClientCredentialsToken(region);
    const res = await fetch(
      `https://${region}.api.blizzard.com/data/wow/media/journal-encounter/${id}?namespace=static-${region}&locale=en_US`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      urlCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json() as {
      assets?: Array<{ key: string; value: string }>;
    };

    const asset = data.assets?.find((a) => a.key === "boss-portrait");
    const url = asset?.value ?? null;
    urlCache.set(cacheKey, url);
    return url;
  } catch {
    urlCache.set(cacheKey, null);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse(null, { status: 400 });
  }

  const region = req.nextUrl.searchParams.get("region") ?? "eu";
  const portraitUrl = await getBossPortraitUrl(id, region);

  if (!portraitUrl) {
    return new NextResponse(null, { status: 404 });
  }

  // Proxy the image with authentication
  try {
    const token = await getClientCredentialsToken(region);
    const imgRes = await fetch(portraitUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!imgRes.ok) return new NextResponse(null, { status: 404 });

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable", // 7 days
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
