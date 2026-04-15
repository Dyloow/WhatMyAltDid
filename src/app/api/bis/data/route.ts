import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import type { BisAnalysisResult } from '../route';

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), 'public', 'data', 'bis');

// Mapping des classes vers leurs slugs de dossier
const CLASS_SLUGS: Record<string, string> = {
  "Death Knight": "death-knight",
  "Demon Hunter": "demon-hunter",
  "Druid": "druid",
  "Evoker": "evoker",
  "Hunter": "hunter",
  "Mage": "mage",
  "Monk": "monk",
  "Paladin": "paladin",
  "Priest": "priest",
  "Rogue": "rogue",
  "Shaman": "shaman",
  "Warlock": "warlock",
  "Warrior": "warrior",
};

/**
 * GET /api/bis/data - Récupère les données BiS pré-générées depuis les JSONs
 * Query params: class, spec
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cls = searchParams.get("class") ?? "";
  const spec = searchParams.get("spec") ?? "";

  if (!cls || !spec) {
    return NextResponse.json(
      { error: "Paramètres class et spec requis." },
      { status: 400 }
    );
  }

  try {
    // Construire le chemin avec le sous-dossier par classe
    const classSlug = CLASS_SLUGS[cls];
    if (!classSlug) {
      return NextResponse.json(
        { error: `Classe inconnue: ${cls}` },
        { status: 400 }
      );
    }
    
    const filename = `${spec.toLowerCase().replace(/\s+/g, '-')}.json`;
    const filepath = path.join(DATA_DIR, classSlug, filename);

    // Lire le fichier JSON
    const content = await fs.readFile(filepath, 'utf-8');
    const data: BisAnalysisResult = JSON.parse(content);

    return NextResponse.json(data);
    
  } catch (error) {
    // Fichier non trouvé ou erreur de lecture
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({
        error: `Données BiS non disponibles pour ${spec} ${cls}. Les données sont générées quotidiennement à 6h.`,
      }, { status: 404 });
    }

    console.error('Erreur lecture BiS data:', error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données." },
      { status: 500 }
    );
  }
}
