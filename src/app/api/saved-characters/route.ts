import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const characters = await prisma.savedCharacter.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(characters);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = await req.json();
  const { name, realm, realmSlug, region, classId } = body;

  if (!name || !realmSlug || !region) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  try {
    const saved = await prisma.savedCharacter.upsert({
      where: {
        userId_name_realmSlug_region: {
          userId: session.userId,
          name: name.trim(),
          realmSlug: realmSlug.trim().toLowerCase(),
          region: region.toLowerCase(),
        },
      },
      update: { realm, classId: classId ?? null },
      create: {
        userId: session.userId,
        name: name.trim(),
        realm: realm ?? realmSlug,
        realmSlug: realmSlug.trim().toLowerCase(),
        region: region.toLowerCase(),
        classId: classId ?? null,
      },
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("[SavedChars] POST error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
