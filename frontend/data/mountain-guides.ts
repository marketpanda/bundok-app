import type { Source } from "@/data/mountains";

type GuideSection = { heading: string; paragraphs: string[] };
export type MountainGuide = {
  slug: string;
  title: string;
  introduction: string;
  duration: string;
  difficulty: string;
  sections: GuideSection[];
  preparation: string[];
  sources: Source[];
  reviewedOn: string;
};

export const mountainGuides: MountainGuide[] = [
  {
    slug: "mount-pulag",
    title: "Mount Pulag",
    introduction: "A Cordillera climb through forest and open grassland, best known for sunrise above the clouds. Choosing the right trail matters as much as choosing the summit.",
    duration: "Usually 2 days via Ambangeg; longer for other routes",
    difficulty: "Moderate via Ambangeg; strenuous via Akiki",
    reviewedOn: "2026-10-05",
    sections: [
      {
        heading: "What makes Mount Pulag special?",
        paragraphs: [
          "Mount Pulag is Luzon’s highest mountain. Its summit landscape opens into grassland and dwarf bamboo, offering wide views across the Cordillera when the weather clears. The sea of clouds is a reason many hikers visit, but visibility depends on conditions rather than a guaranteed sunrise spectacle.",
          "Think of the trip as a high mountain walk rather than a race to a viewpoint. An early start, cold air and sustained walking can make even the gentler route demanding. Choose an itinerary that gives your group time to rest and follow the park briefing.",
        ],
      },
      {
        heading: "Ambangeg or Akiki: which trail should you choose?",
        paragraphs: [
          "Ambangeg is the gentler, more popular approach. An overnight or two-day itinerary is a common starting point for planning. It is the route to consider first if you are new to Pulag, although fitness and preparation still matter.",
          "Akiki involves a steeper, sustained ascent through pine and mossy forest. It suits experienced hikers looking for a more demanding approach; some itineraries climb Akiki and descend Ambangeg. Tawangan is another longer option. Discuss route availability, walking days and campsite arrangements with your guide before choosing a traverse.",
        ],
      },
      {
        heading: "Getting there and arranging your climb",
        paragraphs: [
          "Baguio is a common staging point, with onward transport toward the Bokod or Kabayan access area. Book transport around your confirmed trail and accommodation rather than assuming every Pulag itinerary uses the same jump-off.",
          "Confirm registration, orientation, guide arrangements and any medical-document requirements with the park office or your organizer. Ask which costs are included, where you will sleep, and what happens if the route closes. A Philippine Information Agency report on Akiki’s reopening illustrates why an old itinerary is not proof of current access.",
        ],
      },
      {
        heading: "Weather and what to expect",
        paragraphs: [
          "The tourism guide identifies November to April as the usual drier window, with particularly cold conditions from December to February. Rain, wind and poor visibility can still interrupt a climb. Follow the forecast and park instructions rather than relying on the month alone.",
          "Protect your warm layers from rain and keep a working headlamp accessible. Agree on a turnaround plan with your guide, and leave the grassland, wildlife and campsites as you found them.",
        ],
      },
    ],
    preparation: [
      "Build up to several hours of walking before the trip.",
      "Pack insulation, a waterproof outer layer, a headlamp and spare power.",
      "Confirm the sleeping arrangement and equipment included in your booking.",
      "Ask the park or organizer for the current registration and document checklist.",
    ],
    sources: [
      { label: "Philippines Travel: Pulag routes and planning", url: "https://philippines.travel/spots/mt-pulag/index" },
      { label: "Philippine Information Agency: Pulag weather and Akiki access", url: "https://pia.gov.ph/news/frost-hits-mount-pulag-akiki-trail-opens-jan-9/0/" },
    ],
  },
  {
    slug: "mount-apo",
    title: "Mount Apo",
    introduction: "The Philippines’ highest mountain brings together forest, volcanic terrain and long walking days. Plan the route and logistics before committing to the summit.",
    duration: "Usually 2–4 days, depending on the route",
    difficulty: "Strenuous; terrain and effort vary by route",
    reviewedOn: "2026-10-05",
    sections: [
      {
        heading: "Why climb Mount Apo?",
        paragraphs: [
          "Mount Apo rises to 2,954 metres on Mindanao, spanning the Davao and Cotabato area. The Provincial Government of Davao del Sur identifies it as the Philippines’ highest mountain and a protected natural park. Its volcanic landscape includes several peaks and an old summit crater.",
          "The appeal goes beyond elevation. Different approaches reveal forest, rocky slopes and high mountain scenery. Apo Sandawa also has deep significance to local communities; visit with respect for the people and landscapes that make the climb possible.",
        ],
      },
      {
        heading: "Choosing an Apo route",
        paragraphs: [
          "Kapatagan, Sta. Cruz and Kidapawan are familiar names in Apo itineraries, but the exact entrance and exit need to be agreed with your organizer. The Sta. Cruz approach is associated with boulder terrain and volcanic vents; the Kidapawan side is associated with forest, river crossings and Lake Venado.",
          "A traverse uses different entry and exit points, adding transport and permit coordination. A backtrail returns along the same approach. Allow roughly two to four climbing days as an initial planning range, then confirm a schedule suited to your group rather than treating that range as a promise.",
        ],
      },
      {
        heading: "Access, permits and transport",
        paragraphs: [
          "Davao City and Kidapawan are common gateways. The Province of Cotabato also identifies several approaches on its side of the mountain, so confirm the actual jump-off before booking onward travel.",
          "Arrange the climb with the relevant local office and an accredited guide or operator. Confirm permits, allowed dates, group limits, briefing requirements and medical documents for your chosen route. Ask for an itemized quote covering guides, transport, camping and porter arrangements, and establish the cancellation terms before paying.",
        ],
      },
      {
        heading: "Preparing for long days on the mountain",
        paragraphs: [
          "The tourism guide describes December to May as the usual drier season, but the route’s current status and forecast should decide whether a climb proceeds. Plan for wet ground and cold, windy nights even when travelling in a generally drier month.",
          "Train with the pack you intend to carry and test your overnight equipment beforehand. On volcanic terrain, follow your guide’s directions around vents and avoid lingering near fumes. River crossings, exposed ground and changing weather require decisions based on conditions, not pressure to finish an itinerary.",
        ],
      },
    ],
    preparation: [
      "Build endurance with progressively longer walks and practice carrying your pack.",
      "Confirm shelter, sleeping equipment, meals and water arrangements.",
      "Check that your permit and guide cover the agreed entrance and exit.",
      "Leave enough time for transport changes and a weather-related delay.",
    ],
    sources: [
      { label: "Provincial Government of Davao del Sur: Mount Apo", url: "https://davaodelsur.gov.ph/tourism/mt-apo/" },
      { label: "Province of Cotabato: Mount Apo access routes", url: "https://cotabatoprov.gov.ph/2018/11/26/245/" },
      { label: "Philippines Travel: Apo trails and planning", url: "https://philippines.travel/spots/mt-apo/index" },
      { label: "Mount Apo Geopark: landscape, communities and operators", url: "https://mountapogeopark.com/" },
    ],
  },
  {
    slug: "mount-guiting-guiting",
    title: "Mount Guiting-Guiting",
    introduction: "Sibuyan Island’s jagged summit is a demanding objective for experienced hikers. Exposed rock, route choice and island travel all deserve careful preparation.",
    duration: "A multi-day climb; agree the schedule with your guide",
    difficulty: "Very challenging, with exposed scrambling",
    reviewedOn: "2026-10-05",
    sections: [
      {
        heading: "A different kind of summit challenge",
        paragraphs: [
          "Mount Guiting-Guiting stands at 2,058 metres on Sibuyan Island in Romblon. Its sharp ridges and rocky slopes make it a very different undertaking from a straightforward walking trail. The Philippine Information Agency highlights the physical preparation and equipment needed for its steep, jagged terrain.",
          "The mountain is also part of a protected landscape with distinctive biodiversity. Its natural park was established in 1996 across parts of Magdiwang, Cajidiocan and San Fernando. Treat the forest and ridges as a place to protect, not just a summit to collect.",
        ],
      },
      {
        heading: "Tampayan, Olango and traverse planning",
        paragraphs: [
          "The two established approaches are Tampayan from the north and Olango from the south. A traverse connects different sides of the mountain, while a backtrail returns by the approach used for the ascent. These choices change the transport, camps and pacing of the trip.",
          "Work through the route with a local guide familiar with current conditions. Agree on daily objectives and a turnaround plan before starting. A summit attempt is only one part of the itinerary; your group also needs enough time and energy to negotiate the descent.",
        ],
      },
      {
        heading: "Getting to Sibuyan and arranging access",
        paragraphs: [
          "Plan arrival on Sibuyan separately from the mountain itinerary. Confirm current island transport, accommodation and the transfer to your chosen jump-off before fixing climbing dates. Leave room for a disrupted connection rather than scheduling a climb immediately against a tight return departure.",
          "Published route information identifies the DENR office in Magdiwang as a point for arranging permits and guides. Reconfirm the current process locally, including fees, campsite rules, group arrangements and any required documents. Old trip reports can describe the terrain, but they cannot confirm today’s access conditions.",
          "In a February 2026 report, the Philippine Information Agency announced an annual November-to-January rehabilitation closure and stricter entry requirements. These included training credentials, two recent major climbs, police clearance, a locally issued medical certificate and entry-point tourism registration. Check the latest checklist and closure dates with the park before booking travel.",
        ],
      },
      {
        heading: "Preparation for exposed terrain",
        paragraphs: [
          "Prior experience on long, steep hikes and scrambling terrain is valuable preparation. Discuss your group’s experience honestly with the guide; fitness alone does not establish comfort on exposed rock.",
          "Ask the guide to review footwear, pack weight and equipment before departure. Rain, wind and low visibility can change what is reasonable on a ridge. Follow the guide’s decision to wait or turn back, and pack out everything you bring onto the mountain.",
        ],
      },
    ],
    preparation: [
      "Discuss your scrambling experience and fitness with a local guide.",
      "Agree on route, camps, turnaround points and equipment before travelling.",
      "Confirm permits and the latest access conditions with DENR or the park office.",
      "Allow extra time for island transport and weather changes.",
    ],
    sources: [
      { label: "Philippine Information Agency: Guiting-Guiting terrain and conservation", url: "https://pia.gov.ph/features/natures-unspoiled-gem-discovering-the-magnificence-of-mt-guiting-guiting/" },
      { label: "Philippine Information Agency: 2026 access requirements and annual closure", url: "https://pia.gov.ph/news/mt-guiting-guiting-reopens-to-public-on-30th-anniv-of-natural-park/" },
      { label: "Proclamation No. 746: establishment of the natural park", url: "https://lawphil.net/executive/proc/proc1996/proc_746_1996.html" },
      { label: "Mount Guiting-Guiting: route overview and references", url: "https://en.wikipedia.org/wiki/Mount_Guiting-Guiting" },
    ],
  },
];

export function getMountainGuide(slug: string) {
  return mountainGuides.find((guide) => guide.slug === slug);
}
