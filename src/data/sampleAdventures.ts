export interface SampleAdventure {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const SAMPLE_ADVENTURES: SampleAdventure[] = [
  {
    id: 'mysterious-town',
    name: 'The mysterious town',
    description: 'A 9-scene atmospheric thriller featuring choices, auto-jumps, and multiple endings.',
    code: `Adventure "The mysterious town":
    Begin at Entrance.

Scene Entrance:
    Narrate "You find yourself standing on a desolate gravel road."
    Narrate "A rusted metal sign creaks in the chilly evening wind: 'Welcome to Oakhaven'."
    Option "Walk past the sign toward the town center" leads to TheTown.
    Option "Take the overgrown path into the foggy forest" leads to FoggyForest.

Scene TheTown:
    Narrate "Empty storefronts and shattered windows line the eerie main street."
    Narrate "An abandoned service garage sits to your left, while a dimly lit inn beckons to your right."
    Option "Investigate the rusted garage" leads to Garage.
    Option "Knock on the weathered door of the inn" leads to Inn.

Scene Garage:
    Narrate "Inside the garage, motor oil coats the cracked concrete floor."
    Narrate "You uncover a running vintage motorcycle with keys still resting in the ignition."
    Option "Kickstart the bike and speed down the highway toward home" leads to RoadHome.
    Option "Leave the garage and return to the main street" leads to TheTown.

Scene RoadHome:
    Narrate "The engine roars to life as you tear through the darkness, leaving Oakhaven behind."
    Narrate "The highway signs welcome you back to safety. You survived the mystery."
    Conclude.

Scene Inn:
    Narrate "The inn's heavy wooden door creaks open to an empty hearth and flickering candles."
    Narrate "A handwritten journal on the counter reads: 'The fog claims all who tarry after dusk. Follow the old road.'"
    Option "Heed the journal's warning and head for the old road" leads to OldRoad.
    Option "Retreat back outside to the town square" leads to TheTown.

Scene FoggyForest:
    Narrate "Thick, unnatural mist curls around the gnarled tree trunks."
    Narrate "You lose your sense of direction as shadows appear to dance between the branches."
    Option "Follow a faint set of tire tracks leading east" leads to OldRoad.
    Option "Push forward deeper into a quiet woodland clearing" leads to Clearing.

Scene OldRoad:
    Narrate "The crumbling asphalt gives way to dense brambles and an unexpected roadblock."
    Narrate "Through the mist ahead, you spot the outline of a sturdy wooden cabin."
    Proceed to Cabin.

Scene Clearing:
    Narrate "You step into a tranquil circle of ancient stone monoliths."
    Narrate "A narrow trail through the mist leads directly to the porch of an isolated cabin."
    Proceed to Cabin.

Scene Cabin:
    Narrate "The cabin door is unlocked. Inside, a warm fire crackles quietly."
    Narrate "On the wooden table lies a map leading out of the valley and a steaming cup of tea."
    Narrate "You have found sanctuary from the unnatural fog."
    Conclude.
`,
  },
  {
    id: 'blank-template',
    name: 'Blank Template',
    description: 'A clean, minimal 2-scene starter skeleton for quick prototyping.',
    code: `Adventure "Blank Template":
    Begin at Start.

Scene Start:
    Narrate "Your journey begins in an unfamiliar chamber."
    Narrate "Two archways stand before you in silence."
    Option "Step through the left archway" leads to Crossroads.
    Option "Step through the right archway" leads to Crossroads.

Scene Crossroads:
    Narrate "Both passages lead to an expansive hall lit by blue crystalline torches."
    Narrate "The journey has only just begun."
    Conclude.
`,
  },
  {
    id: 'dungeon-puzzle',
    name: 'The Lost Crypt (With Unreachable Warning)',
    description: 'Demonstrates graph branches, warnings for an unreachable secret chamber, and loopbacks.',
    code: `Adventure "The Lost Crypt":
    Begin at ChamberOfEchoes.

Scene ChamberOfEchoes:
    Narrate "The entrance collapses behind you in a storm of ancient dust."
    Narrate "Faint light glints from a pedestal holding a brass key."
    Option "Take the brass key and descend into the deep vault" leads to Vault.
    Option "Examine the carvings along the damp stone wall" leads to WallMurals.

Scene WallMurals:
    Narrate "The murals depict a forgotten king sealing an eldritch gate."
    Narrate "A secret latch clicks as you touch the king's crown."
    Proceed to Vault.

Scene Vault:
    Narrate "You step onto a marble balcony overlooking an underground subterranean lake."
    Option "Board the tethered ferry to reach the far bank" leads to FarBank.
    Option "Return back up to inspect the Chamber of Echoes" leads to ChamberOfEchoes.

Scene FarBank:
    Narrate "The ferry glides across the motionless black water."
    Narrate "You step onto dry land and see the daylight shimmering ahead."
    Conclude.

Scene SecretObservatory:
    Narrate "This hidden chamber looks out over the subterranean abyss."
    Narrate "Notice how this scene triggers an unreachable warning on the story map!"
    Conclude.
`,
  },
];
