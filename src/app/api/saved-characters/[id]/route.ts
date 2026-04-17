import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.savedCharacter.delete({
      where: { id, userId: session.userId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Personnage introuvable." }, { status: 404 });
  }
}
