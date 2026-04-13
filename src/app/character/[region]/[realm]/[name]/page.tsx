import { getRioCharacterProfileFull } from "@/lib/raiderio-api";
import { CharacterDetailClient } from "@/components/character-detail";
import { CharacterNotIndexed } from "@/components/character-not-indexed";

interface Props {
  params: Promise<{ region: string; realm: string; name: string }>;
}

export default async function CharacterPage({ params }: Props) {
  const { region, realm, name } = await params;

  // Next.js 16 does NOT auto-decode dynamic segment params — decode manually.
  const decodedName  = decodeURIComponent(name);
  const decodedRealm = decodeURIComponent(realm);

  const profile = await getRioCharacterProfileFull(region, decodedRealm, decodedName);

  if (!profile) {
    return <CharacterNotIndexed name={decodedName} realm={decodedRealm} region={region} />;
  }

  return (
    <CharacterDetailClient
      profile={profile}
      region={region}
      realm={decodedRealm}
      name={decodedName}
    />
  );
}

export async function generateMetadata({ params }: Props) {
  const { name, realm } = await params;
  return {
    title: `${decodeURIComponent(name)} — ${decodeURIComponent(realm)} · WhatMyAltDid`,
  };
}
