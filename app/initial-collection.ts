import type { CollectionState, OwnedEntry } from "./collection-model";

export const INITIAL_COLLECTION_SOURCE = {
  file: "SNES_GAMES.xlsx",
  importedAt: "2026-08-09T21:49:00.000Z",
  importedGames: 118,
  purchaseTotalCents: 204200,
  unmatched: ["Super Game Boy"],
} as const;

const ROWS = [["snes-0017-aladdin","m",false,1,1500,""],["snes-0019-alien-3","m",false,1,1300,""],["snes-0030-asterix-obelix","mba",true,1,2200,"CIB"],["snes-0031-axelay","m",false,1,2200,""],["snes-0040-battletoads-in-battlemaniacs","m",false,1,1800,""],["snes-0057-brutal-paws-of-fury","ma",false,1,1000,"Anleitung"],["snes-0060-bugs-bunny-rabbit-rampage","m",false,1,1100,""],["snes-0062-cal-ripken-jr-baseball","m",false,1,600,""],["snes-0080-cool-spot","m",false,1,1100,""],["snes-0083-daffy-duck-marvin-missions","m",false,1,1600,""],["snes-0446-the-lion-king","m",false,1,1600,""],["snes-0454-the-smurfs","m",false,1,1100,""],["snes-0092-dino-city","m",false,1,1100,""],["snes-0097-donkey-kong-country","mba",true,1,4500,"CIB"],["snes-0098-donkey-kong-country-2","ma",false,1,3800,"Anleitung"],["snes-0099-donkey-kong-country-3","ma",false,1,3800,"Anleitung"],["snes-0113-eek-the-cat","m",false,1,1000,""],["snes-0129-fifa-international-soccer","m",false,1,700,""],["snes-0131-fifa-soccer-96","m",false,1,400,""],["snes-0135-first-samurai","m",false,1,1100,""],["snes-0119-f-zero","m",false,1,1200,""],["snes-0144-gods","m",false,1,2700,""],["snes-0145-goof-troop","m",false,1,1500,""],["snes-0150-harvest-moon","m",false,1,5000,""],["snes-0208-lord-of-the-rings","m",false,1,1500,""],["snes-0165-international-superstar-soccer","m",false,1,900,""],["snes-0173-jimmy-connors-pro-tennis-tour","mba",true,1,1500,"CIB"],["snes-0177-judge-dredd","m",false,1,1300,""],["snes-0179-jurassic-park","m",false,1,1300,""],["snes-0182-kawasaki-superbikes","m",false,1,400,""],["snes-0183-kevin-keegan-s-player-manager","m",false,1,700,""],["snes-0186-kid-klown-in-crazy-chase","m",false,1,800,""],["snes-0193-kirby-s-ghost-trap","m",false,1,1700,""],["snes-0195-krusty-s-super-fun-house","m",false,1,900,""],["snes-0202-lemmings","m",false,1,1200,""],["snes-0207-looney-tunes-road-runner","m",false,1,1000,""],["snes-0209-lucky-luke","mba",true,1,3200,"CIB"],["snes-0212-madden-nfl-95","m",false,1,600,""],["snes-0218-mario-is-missing","m",false,1,1600,""],["snes-0219-mario-paint","ma",false,1,3000,"Anleitung, Maus, Mauspad"],["snes-0233-mickey-mania","m",false,1,1100,""],["snes-0215-magical-quest-starring-mickey-mouse","m",false,1,1100,""],["snes-0235-micro-machines-2-turbo-tournament","m",false,1,1500,""],["snes-0244-mr-nutz","mba",false,1,3500,"CIB (ohne Inlay)"],["snes-0253-nba-live-96","m",false,1,700,""],["snes-0254-nba-live-97","m",false,1,400,""],["snes-0252-nba-live-95","m",false,1,700,""],["snes-0256-nfl-quarterback-club","m",false,1,700,""],["snes-0260-nhl-97","m",false,1,800,""],["snes-0264-nigel-mansell-s-world-championship-racing","m",false,1,500,""],["snes-0273-pac-attack","m",false,1,800,""],["snes-0275-pac-man-2-the-new-adventures","m",false,1,1000,""],["snes-0276-paperboy-2","m",false,1,1200,""],["snes-0277-parodius","m",false,1,2700,""],["snes-0284-pilotwings","mb",false,1,2500,"OVP ohne Anleitung"],["snes-0285-pinball-dreams","m",false,1,1000,""],["snes-0288-pinocchio","m",false,1,1100,""],["snes-0296-pop-n-twinbee-rainbow-bell-adventures","m",false,1,2500,""],["snes-0306-prince-of-persia","m",false,1,1700,""],["snes-0316-revolution-x","m",false,1,1000,""],["snes-0317-rise-of-the-robots","mba",true,1,2000,"CIB"],["snes-0324-s-o-s-sink-or-swim","m",false,1,1000,""],["snes-0329-secret-of-evermore","m",false,1,2500,""],["snes-0330-secret-of-mana","m",false,1,3200,""],["snes-0338-simcity","m",false,1,1000,""],["snes-0351-spectre","mba",true,1,2000,"CIB"],["snes-0354-spindizzy-worlds","mba",true,1,2000,"CIB"],["snes-0355-spirou","mba",true,1,3000,"CIB"],["snes-0357-star-trek-starfleet-academy","m",false,1,1200,""],["snes-0358-star-trek-the-next-generation","m",false,1,1300,""],["snes-0360-starwing","m",false,1,800,""],["snes-0363-street-fighter-ii","m",false,1,1100,""],["snes-0364-street-fighter-ii-turbo","m",false,1,1400,""],["snes-0365-street-racer","m",false,1,900,""],["snes-0366-striker","m",false,1,500,""],["snes-0367-stunt-race-fx","m",false,2,800,"x2"],["snes-0369-super-adventure-island","m",false,1,1600,""],["snes-0371-super-air-diver","m",false,1,1000,""],["snes-0374-super-battleship","mba",true,1,3800,"CIB"],["snes-0380-super-castlevania-iv","m",false,1,4500,""],["snes-0386-super-ghouls-n-ghosts","m",false,1,2000,""],["snes-0389-super-ice-hockey","m",false,1,1000,""],["snes-0184-kick-off","m",false,1,700,""],["snes-0392-super-mario-all-stars","m",false,1,1400,""],["snes-0394-super-mario-kart","m",false,1,2200,""],["snes-0395-super-mario-world","m",false,1,1600,""],["snes-0396-super-mario-world-2-yoshi-s-island","m",false,1,2200,""],["snes-0405-super-r-type","m",false,1,1400,""],["snes-0407-super-soccer","m",false,2,500,"x2"],["snes-0408-super-star-wars","m",false,1,1300,""],["snes-0415-super-tennis","m",false,1,600,""],["snes-0429-terranigma","m",false,1,3500,""],["snes-0432-tetris-attack","m",false,1,2200,""],["snes-0442-the-humans","m",false,1,1300,""],["snes-0157-hunt-for-red-october","mb",false,1,2500,"OVP ohne Anleitung"],["snes-0443-the-incredible-hulk","m",false,1,900,""],["snes-0163-incredible-crash-dummies","m",false,1,900,""],["snes-0445-the-jungle-book","m",false,1,1200,""],["snes-0447-the-lost-vikings","m",false,1,1700,""],["snes-0448-the-lost-vikings-2","mba",true,1,13000,"CIB"],["snes-0449-the-mask","m",false,1,1800,""],["snes-0450-the-pagemaster","m",false,1,1500,""],["snes-0456-theme-park","m",false,1,1200,""],["snes-0462-tintin-in-tibet","m",false,1,5200,""],["snes-0461-timon-and-pumbaa-jungle-games","m",false,1,1100,""],["snes-0463-tiny-toon-adventures-buster-busts-loose","m",false,1,900,""],["snes-0484-utopia-the-creation-of-a-nation","m",false,1,900,""],["snes-0491-warlock","m",false,1,700,""],["snes-0497-where-in-the-world-is-carmen-sandiego","m",false,1,1700,""],["snes-0501-williams-arcade-s-greatest-hits","m",false,1,1500,""],["snes-0503-wing-commander-secret-missions","m",false,1,700,""],["snes-0510-world-cup-usa-94","m",false,1,300,""],["snes-0512-world-league-basketball","m",false,1,500,""],["snes-0514-worms","m",false,1,2500,""],["snes-0516-wwf-royal-rumble","m",false,1,1100,""],["snes-0525-young-merlin","mba",true,1,2400,"CIB"],["snes-0526-zelda-link-to-the-past","mba",true,1,7500,"CIB"],["snes-0528-zombies","m",false,1,3000,""]] as const;

function entry(mask: string, completeInBox: boolean, quantity: number, purchasePrice: number, notes: string): OwnedEntry {
  return {
    components: {
      module: mask.includes("m"),
      box: mask.includes("b"),
      manual: mask.includes("a"),
    },
    completeInBox,
    sealed: false,
    quantity,
    purchasePrice,
    purchaseDate: "",
    notes,
    addedAt: INITIAL_COLLECTION_SOURCE.importedAt,
    updatedAt: INITIAL_COLLECTION_SOURCE.importedAt,
  };
}

export const INITIAL_COLLECTION_STATE: CollectionState = {
  version: 2,
  owned: Object.fromEntries(
    ROWS.map(([gameId, mask, completeInBox, quantity, purchasePrice, notes]) => [
      gameId,
      entry(mask, completeInBox, quantity, purchasePrice, notes),
    ]),
  ),
};
