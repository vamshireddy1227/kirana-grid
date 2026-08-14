// In-memory store shaped exactly like the Postgres schema in architecture.md.
// Swapping this for a real `pg` pool later means the services/routes above it
// do not change — they only ever call db.* functions, never touch storage directly.

let uidCounter = 1;
function uid(prefix) {
  return `${prefix}_${(uidCounter++).toString(36)}${Date.now().toString(36).slice(-4)}`;
}

const cities = [
  // Telangana — all 33 districts
  { id: "city_hyd", name: "Hyderabad", state: "Telangana", tier: 1 },
  { id: "city_warangal", name: "Warangal", state: "Telangana", tier: 2 },
  { id: "city_nizamabad", name: "Nizamabad", state: "Telangana", tier: 3 },
  { id: "city_karimnagar", name: "Karimnagar", state: "Telangana", tier: 3 },
  { id: "city_adilabad", name: "Adilabad", state: "Telangana", tier: 3 },
  { id: "city_bhadradri_kothagudem", name: "Bhadradri Kothagudem", state: "Telangana", tier: 3 },
  { id: "city_hanumakonda", name: "Hanumakonda", state: "Telangana", tier: 2 },
  { id: "city_jagtial", name: "Jagtial", state: "Telangana", tier: 3 },
  { id: "city_jangaon", name: "Jangaon", state: "Telangana", tier: 3 },
  { id: "city_jayashankar_bhupalpally", name: "Jayashankar Bhupalpally", state: "Telangana", tier: 3 },
  { id: "city_jogulamba_gadwal", name: "Jogulamba Gadwal", state: "Telangana", tier: 3 },
  { id: "city_kamareddy", name: "Kamareddy", state: "Telangana", tier: 3 },
  { id: "city_khammam", name: "Khammam", state: "Telangana", tier: 2 },
  { id: "city_komaram_bheem_asifabad", name: "Komaram Bheem Asifabad", state: "Telangana", tier: 3 },
  { id: "city_mahabubabad", name: "Mahabubabad", state: "Telangana", tier: 3 },
  { id: "city_mahabubnagar", name: "Mahabubnagar", state: "Telangana", tier: 2 },
  { id: "city_mancherial", name: "Mancherial", state: "Telangana", tier: 3 },
  { id: "city_medak", name: "Medak", state: "Telangana", tier: 3 },
  { id: "city_medchal_malkajgiri", name: "Medchal-Malkajgiri", state: "Telangana", tier: 2 },
  { id: "city_mulugu", name: "Mulugu", state: "Telangana", tier: 3 },
  { id: "city_nagarkurnool", name: "Nagarkurnool", state: "Telangana", tier: 3 },
  { id: "city_nalgonda", name: "Nalgonda", state: "Telangana", tier: 2 },
  { id: "city_narayanpet", name: "Narayanpet", state: "Telangana", tier: 3 },
  { id: "city_nirmal", name: "Nirmal", state: "Telangana", tier: 3 },
  { id: "city_peddapalli", name: "Peddapalli", state: "Telangana", tier: 3 },
  { id: "city_rajanna_sircilla", name: "Rajanna Sircilla", state: "Telangana", tier: 3 },
  { id: "city_rangareddy", name: "Rangareddy", state: "Telangana", tier: 2 },
  { id: "city_sangareddy", name: "Sangareddy", state: "Telangana", tier: 2 },
  { id: "city_siddipet", name: "Siddipet", state: "Telangana", tier: 3 },
  { id: "city_suryapet", name: "Suryapet", state: "Telangana", tier: 3 },
  { id: "city_vikarabad", name: "Vikarabad", state: "Telangana", tier: 3 },
  { id: "city_wanaparthy", name: "Wanaparthy", state: "Telangana", tier: 3 },
  { id: "city_yadadri_bhuvanagiri", name: "Yadadri Bhuvanagiri", state: "Telangana", tier: 3 },

  // Andhra Pradesh — all 28 districts (as of the Dec 2025 reorganization: 26 → 28)
  { id: "city_vizag", name: "Visakhapatnam", state: "Andhra Pradesh", tier: 2 },
  { id: "city_vijayawada", name: "Vijayawada", state: "Andhra Pradesh", tier: 2 }, // NTR district HQ
  { id: "city_guntur", name: "Guntur", state: "Andhra Pradesh", tier: 2 },
  { id: "city_nellore", name: "Nellore", state: "Andhra Pradesh", tier: 3 }, // SPSR Nellore district
  { id: "city_kurnool", name: "Kurnool", state: "Andhra Pradesh", tier: 3 },
  { id: "city_tirupati", name: "Tirupati", state: "Andhra Pradesh", tier: 2 },
  { id: "city_srikakulam", name: "Srikakulam", state: "Andhra Pradesh", tier: 2 },
  { id: "city_parvathipuram_manyam", name: "Parvathipuram Manyam", state: "Andhra Pradesh", tier: 3 },
  { id: "city_vizianagaram", name: "Vizianagaram", state: "Andhra Pradesh", tier: 2 },
  { id: "city_anakapalli", name: "Anakapalli", state: "Andhra Pradesh", tier: 2 },
  { id: "city_alluri_sitharama_raju", name: "Alluri Sitharama Raju", state: "Andhra Pradesh", tier: 3 },
  { id: "city_polavaram", name: "Polavaram", state: "Andhra Pradesh", tier: 3 }, // formed Dec 2025
  { id: "city_kakinada", name: "Kakinada", state: "Andhra Pradesh", tier: 2 },
  { id: "city_east_godavari", name: "East Godavari", state: "Andhra Pradesh", tier: 2 }, // HQ Rajahmundry
  { id: "city_konaseema", name: "Konaseema", state: "Andhra Pradesh", tier: 3 }, // HQ Amalapuram
  { id: "city_west_godavari", name: "West Godavari", state: "Andhra Pradesh", tier: 3 }, // HQ Bhimavaram
  { id: "city_eluru", name: "Eluru", state: "Andhra Pradesh", tier: 2 },
  { id: "city_krishna", name: "Krishna", state: "Andhra Pradesh", tier: 3 }, // HQ Machilipatnam
  { id: "city_palnadu", name: "Palnadu", state: "Andhra Pradesh", tier: 3 }, // HQ Narasaraopet
  { id: "city_bapatla", name: "Bapatla", state: "Andhra Pradesh", tier: 3 },
  { id: "city_markapuram", name: "Markapuram", state: "Andhra Pradesh", tier: 3 }, // formed Dec 2025
  { id: "city_prakasam", name: "Prakasam", state: "Andhra Pradesh", tier: 2 }, // HQ Ongole
  { id: "city_nandyal", name: "Nandyal", state: "Andhra Pradesh", tier: 3 },
  { id: "city_anantapur", name: "Anantapur", state: "Andhra Pradesh", tier: 2 },
  { id: "city_sri_sathya_sai", name: "Sri Sathya Sai", state: "Andhra Pradesh", tier: 3 }, // HQ Puttaparthi
  { id: "city_ysr_kadapa", name: "YSR Kadapa", state: "Andhra Pradesh", tier: 2 },
  { id: "city_annamayya", name: "Annamayya", state: "Andhra Pradesh", tier: 3 }, // HQ Rayachoti
  { id: "city_chittoor", name: "Chittoor", state: "Andhra Pradesh", tier: 2 },
];

// Not every mandal/town in both states — this is district-level coverage:
// every one of Telangana's 33 districts and Andhra Pradesh's 28 (post the
// Dec 2025 reorganization that added Polavaram and Markapuram), each
// represented by its district headquarters town. Coordinates for the
// original 10 cities' multiple zones are real neighborhood-level; the 51
// newly added single-zone districts use the headquarters town's
// approximate center — good enough for this simulation, not
// survey-grade. Easy to extend further: add a zone, everything else
// (businesses, drivers, simulation) picks it up automatically.
const zones = [
  // Hyderabad (existing, unchanged)
  { id: "zone_banjara", city_id: "city_hyd", name: "Banjara Hills", lat: 17.4156, lng: 78.4347, base_delivery_fee: 25, radius_km: 2.5 },
  { id: "zone_hitech", city_id: "city_hyd", name: "Hitech City", lat: 17.4483, lng: 78.3915, base_delivery_fee: 30, radius_km: 3 },
  { id: "zone_secun", city_id: "city_hyd", name: "Secunderabad", lat: 17.4399, lng: 78.4983, base_delivery_fee: 22, radius_km: 2.5 },
  { id: "zone_gachi", city_id: "city_hyd", name: "Gachibowli", lat: 17.4401, lng: 78.3489, base_delivery_fee: 28, radius_km: 2.5 },

  // Warangal
  { id: "zone_hanamkonda", city_id: "city_warangal", name: "Hanamkonda", lat: 18.0068, lng: 79.5589, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_kazipet", city_id: "city_warangal", name: "Kazipet", lat: 18.0114, lng: 79.5722, base_delivery_fee: 20, radius_km: 2 },

  // Nizamabad
  { id: "zone_nizamabad_old", city_id: "city_nizamabad", name: "Old Nizamabad", lat: 18.6725, lng: 78.0941, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_bodhan_rd", city_id: "city_nizamabad", name: "Bodhan Road", lat: 18.6836, lng: 78.0870, base_delivery_fee: 18, radius_km: 2 },

  // Karimnagar
  { id: "zone_christian_colony", city_id: "city_karimnagar", name: "Christian Colony", lat: 18.4392, lng: 79.1288, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_hb_colony", city_id: "city_karimnagar", name: "Housing Board Colony", lat: 18.4475, lng: 79.1195, base_delivery_fee: 18, radius_km: 2 },

  // ── Remaining Telangana districts (one zone each, at the district HQ) ──
  { id: "zone_adilabad", city_id: "city_adilabad", name: "Adilabad Town", lat: 19.6641, lng: 78.5320, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_kothagudem", city_id: "city_bhadradri_kothagudem", name: "Kothagudem", lat: 17.5561, lng: 80.6198, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_hanumakonda_town", city_id: "city_hanumakonda", name: "Hanumakonda Town", lat: 18.0088, lng: 79.5541, base_delivery_fee: 20, radius_km: 2 },
  { id: "zone_jagtial_town", city_id: "city_jagtial", name: "Jagtial Town", lat: 18.7909, lng: 78.9110, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_jangaon_town", city_id: "city_jangaon", name: "Jangaon Town", lat: 17.7264, lng: 79.1804, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_bhupalpally", city_id: "city_jayashankar_bhupalpally", name: "Bhupalpally", lat: 18.4009, lng: 79.9106, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_gadwal", city_id: "city_jogulamba_gadwal", name: "Gadwal", lat: 16.2311, lng: 77.8058, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_kamareddy_town", city_id: "city_kamareddy", name: "Kamareddy Town", lat: 18.3204, lng: 78.3499, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_khammam_town", city_id: "city_khammam", name: "Khammam Town", lat: 17.2473, lng: 80.1514, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_asifabad", city_id: "city_komaram_bheem_asifabad", name: "Asifabad", lat: 19.3667, lng: 79.2833, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_mahabubabad_town", city_id: "city_mahabubabad", name: "Mahabubabad Town", lat: 17.5983, lng: 80.0022, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_mahabubnagar_town", city_id: "city_mahabubnagar", name: "Mahabubnagar Town", lat: 16.7488, lng: 77.9855, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_mancherial_town", city_id: "city_mancherial", name: "Mancherial Town", lat: 18.8712, lng: 79.4639, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_medak_town", city_id: "city_medak", name: "Medak Town", lat: 18.0460, lng: 78.2669, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_medchal", city_id: "city_medchal_malkajgiri", name: "Medchal", lat: 17.6295, lng: 78.4801, base_delivery_fee: 22, radius_km: 2.5 },
  { id: "zone_mulugu_town", city_id: "city_mulugu", name: "Mulugu Town", lat: 18.1900, lng: 80.0100, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_nagarkurnool_town", city_id: "city_nagarkurnool", name: "Nagarkurnool Town", lat: 16.4831, lng: 78.3255, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_nalgonda_town", city_id: "city_nalgonda", name: "Nalgonda Town", lat: 17.0575, lng: 79.2685, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_narayanpet_town", city_id: "city_narayanpet", name: "Narayanpet Town", lat: 16.7444, lng: 77.4936, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_nirmal_town", city_id: "city_nirmal", name: "Nirmal Town", lat: 19.0968, lng: 78.3441, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_peddapalli_town", city_id: "city_peddapalli", name: "Peddapalli Town", lat: 18.6118, lng: 79.3746, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_sircilla", city_id: "city_rajanna_sircilla", name: "Sircilla", lat: 18.3897, lng: 78.8397, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_rangareddy_town", city_id: "city_rangareddy", name: "Shamshabad", lat: 17.2537, lng: 78.4685, base_delivery_fee: 22, radius_km: 2.5 },
  { id: "zone_sangareddy_town", city_id: "city_sangareddy", name: "Sangareddy Town", lat: 17.6255, lng: 78.0873, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_siddipet_town", city_id: "city_siddipet", name: "Siddipet Town", lat: 18.1018, lng: 78.8480, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_suryapet_town", city_id: "city_suryapet", name: "Suryapet Town", lat: 17.1400, lng: 79.6200, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_vikarabad_town", city_id: "city_vikarabad", name: "Vikarabad Town", lat: 17.3378, lng: 77.9042, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_wanaparthy_town", city_id: "city_wanaparthy", name: "Wanaparthy Town", lat: 16.3607, lng: 78.0649, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_bhuvanagiri", city_id: "city_yadadri_bhuvanagiri", name: "Bhuvanagiri", lat: 17.5167, lng: 78.8833, base_delivery_fee: 18, radius_km: 2 },

  // Visakhapatnam (existing, unchanged)
  { id: "zone_mvp", city_id: "city_vizag", name: "MVP Colony", lat: 17.7326, lng: 83.3332, base_delivery_fee: 20, radius_km: 2 },
  { id: "zone_dwaraka", city_id: "city_vizag", name: "Dwaraka Nagar", lat: 17.7231, lng: 83.3016, base_delivery_fee: 20, radius_km: 2 },

  // Vijayawada
  { id: "zone_governorpet", city_id: "city_vijayawada", name: "Governorpet", lat: 16.5140, lng: 80.6252, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_benz_circle", city_id: "city_vijayawada", name: "Benz Circle", lat: 16.5062, lng: 80.6480, base_delivery_fee: 22, radius_km: 2.5 },

  // Guntur
  { id: "zone_brodipet", city_id: "city_guntur", name: "Brodipet", lat: 16.3033, lng: 80.4400, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_lakshmipuram", city_id: "city_guntur", name: "Lakshmipuram", lat: 16.3125, lng: 80.4365, base_delivery_fee: 18, radius_km: 2 },

  // Nellore
  { id: "zone_trunk_rd", city_id: "city_nellore", name: "Trunk Road", lat: 14.4426, lng: 79.9865, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_dargamitta", city_id: "city_nellore", name: "Dargamitta", lat: 14.4552, lng: 79.9776, base_delivery_fee: 18, radius_km: 2 },

  // Kurnool
  { id: "zone_budhwarpet", city_id: "city_kurnool", name: "Budhwarpet", lat: 15.8281, lng: 78.0373, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_gooty_rd", city_id: "city_kurnool", name: "Gooty Road", lat: 15.8215, lng: 78.0498, base_delivery_fee: 18, radius_km: 2 },

  // Tirupati
  { id: "zone_rc_rd", city_id: "city_tirupati", name: "RC Road", lat: 13.6339, lng: 79.4205, base_delivery_fee: 20, radius_km: 2 },
  { id: "zone_tirumala_bypass", city_id: "city_tirupati", name: "Tirumala Bypass", lat: 13.6480, lng: 79.4085, base_delivery_fee: 20, radius_km: 2 },

  // ── Remaining Andhra Pradesh districts (one zone each, at the district HQ) ──
  { id: "zone_srikakulam_town", city_id: "city_srikakulam", name: "Srikakulam Town", lat: 18.2949, lng: 83.8938, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_parvathipuram", city_id: "city_parvathipuram_manyam", name: "Parvathipuram", lat: 18.7833, lng: 83.4333, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_vizianagaram_town", city_id: "city_vizianagaram", name: "Vizianagaram Town", lat: 18.1167, lng: 83.4167, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_anakapalli_town", city_id: "city_anakapalli", name: "Anakapalli Town", lat: 17.6910, lng: 83.0037, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_paderu", city_id: "city_alluri_sitharama_raju", name: "Paderu", lat: 18.0500, lng: 82.6667, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_rampachodavaram", city_id: "city_polavaram", name: "Rampachodavaram", lat: 17.4390, lng: 81.7750, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_kakinada_town", city_id: "city_kakinada", name: "Kakinada Town", lat: 16.9891, lng: 82.2475, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_rajahmundry", city_id: "city_east_godavari", name: "Rajahmundry", lat: 17.0005, lng: 81.8040, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_amalapuram", city_id: "city_konaseema", name: "Amalapuram", lat: 16.5788, lng: 82.0064, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_bhimavaram", city_id: "city_west_godavari", name: "Bhimavaram", lat: 16.5449, lng: 81.5212, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_eluru_town", city_id: "city_eluru", name: "Eluru Town", lat: 16.7107, lng: 81.0952, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_machilipatnam", city_id: "city_krishna", name: "Machilipatnam", lat: 16.1875, lng: 81.1389, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_narasaraopet", city_id: "city_palnadu", name: "Narasaraopet", lat: 16.2357, lng: 80.0499, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_bapatla_town", city_id: "city_bapatla", name: "Bapatla Town", lat: 15.9046, lng: 80.4680, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_markapuram_town", city_id: "city_markapuram", name: "Markapuram Town", lat: 15.7350, lng: 79.2700, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_ongole", city_id: "city_prakasam", name: "Ongole", lat: 15.5057, lng: 80.0499, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_nandyal_town", city_id: "city_nandyal", name: "Nandyal Town", lat: 15.4785, lng: 78.4835, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_anantapur_town", city_id: "city_anantapur", name: "Anantapur Town", lat: 14.6819, lng: 77.6006, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_puttaparthi", city_id: "city_sri_sathya_sai", name: "Puttaparthi", lat: 14.1594, lng: 77.8107, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_kadapa_town", city_id: "city_ysr_kadapa", name: "Kadapa Town", lat: 14.4753, lng: 78.8298, base_delivery_fee: 20, radius_km: 2.5 },
  { id: "zone_rayachoti", city_id: "city_annamayya", name: "Rayachoti", lat: 14.0500, lng: 78.7500, base_delivery_fee: 18, radius_km: 2 },
  { id: "zone_chittoor_town", city_id: "city_chittoor", name: "Chittoor Town", lat: 13.2172, lng: 79.1003, base_delivery_fee: 20, radius_km: 2.5 },
];

function jitter(base, spread) {
  return base + (Math.random() - 0.5) * spread;
}

const businesses = [];
const products = [];
zones.forEach((z, zi) => {
  const count = 3 + (zi % 3);
  for (let i = 0; i < count; i++) {
    const b = {
      id: uid("biz"),
      zone_id: z.id,
      city_id: z.city_id,
      name: `${z.name} ${["Supermarket", "Pharmacy", "Kirana Store", "Warehouse"][i % 4]}`,
      category: ["supermarket", "pharmacy", "kirana", "warehouse"][i % 4],
      lat: jitter(z.lat, 0.02),
      lng: jitter(z.lng, 0.02),
      service_radius_km: 5,
      is_open: true,
    };
    businesses.push(b);
    for (let p = 0; p < 3; p++) {
      products.push({
        id: uid("prod"),
        business_id: b.id,
        name: `Item ${p + 1}`,
        price: Math.round(jitter(150, 200)),
        stock_qty: Math.floor(jitter(40, 60)),
      });
    }
  }
});

const drivers = [];
zones.forEach((z, zi) => {
  const count = 4 + (zi % 3);
  for (let i = 0; i < count; i++) {
    drivers.push({
      id: uid("drv"),
      zone_id: z.id,
      city_id: z.city_id,
      vehicle_type: i % 5 === 0 ? "van" : "bike",
      status: Math.random() > 0.35 ? "online" : "offline",
      lat: jitter(z.lat, 0.02),
      lng: jitter(z.lng, 0.02),
      rating: +(4 + Math.random()).toFixed(2),
      completed_deliveries: Math.floor(Math.random() * 400),
      on_time_rate: +(80 + Math.random() * 20).toFixed(1),
      current_batch_load: 0,
      target: { lat: jitter(z.lat, 0.02), lng: jitter(z.lng, 0.02) },
    });
  }
});

const orders = [];
const orderEvents = [];
const orderItems = []; // { id, order_id, product_id, product_name_snapshot, quantity, unit_price, subtotal }
const carts = {}; // customerId -> { items: [{ id, product_id, quantity }] }
const cityRevenue = Object.fromEntries(cities.map((c) => [c.id, 0]));

// ── Metrics support structures ─────────────────────────────────────
// Kept separate from the core tables above (mirrors how a real system
// would keep this in a metrics/analytics store, not the transactional one).
const metrics = {
  totalOrders: Object.fromEntries(cities.map((c) => [c.id, 0])),
  deliveredCount: Object.fromEntries(cities.map((c) => [c.id, 0])),
  slaBreachCount: Object.fromEntries(cities.map((c) => [c.id, 0])),
  deliveryDurationsMin: Object.fromEntries(cities.map((c) => [c.id, []])), // capped ring buffer per city
  orderTimestamps: Object.fromEntries(cities.map((c) => [c.id, []])), // for orders/minute
  zoneDemand: Object.fromEntries(zones.map((z) => [z.id, 0])), // rolling count, decays over time
};

const MAX_DURATION_SAMPLES = 100;
const MAX_TIMESTAMP_SAMPLES = 300;

function recordOrderCreated(cityId, zoneId) {
  metrics.totalOrders[cityId] = (metrics.totalOrders[cityId] || 0) + 1;
  const ts = metrics.orderTimestamps[cityId];
  ts.push(Date.now());
  if (ts.length > MAX_TIMESTAMP_SAMPLES) ts.shift();
  metrics.zoneDemand[zoneId] = (metrics.zoneDemand[zoneId] || 0) + 1;
}

function recordOrderCompleted(cityId, durationMin, onTime) {
  metrics.deliveredCount[cityId] = (metrics.deliveredCount[cityId] || 0) + 1;
  if (!onTime) metrics.slaBreachCount[cityId] = (metrics.slaBreachCount[cityId] || 0) + 1;
  const durations = metrics.deliveryDurationsMin[cityId];
  durations.push(durationMin);
  if (durations.length > MAX_DURATION_SAMPLES) durations.shift();
}

// Demand decays over time so the heatmap reflects recent activity, not
// all-time totals — otherwise the first zone to get busy stays "hottest" forever.
function decayZoneDemand() {
  Object.keys(metrics.zoneDemand).forEach((zid) => {
    metrics.zoneDemand[zid] = Math.max(0, metrics.zoneDemand[zid] * 0.92);
  });
}

// ── Demo mode ───────────────────────────────────────────────────────
// Global multiplier the simulator reads each tick. Demo mode = faster order
// spawn rate + higher forced online-driver ratio, so the dashboard reads as
// a "real company running live" instead of a sparse trickle of test events.
const demoState = { active: false, spawnMultiplier: 1, startedAt: null };

function logEvent(orderId, event, metadata = {}) {
  orderEvents.push({ order_id: orderId, event, metadata, ts: Date.now() });
}

module.exports = {
  uid,
  cities,
  zones,
  businesses,
  products,
  drivers,
  orders,
  orderEvents,
  orderItems,
  carts,
  cityRevenue,
  metrics,
  demoState,
  recordOrderCreated,
  recordOrderCompleted,
  decayZoneDemand,
  logEvent,
  findZone: (id) => zones.find((z) => z.id === id),
  findBusiness: (id) => businesses.find((b) => b.id === id),
  findDriver: (id) => drivers.find((d) => d.id === id),
  findOrder: (id) => orders.find((o) => o.id === id),
  findProduct: (id) => products.find((p) => p.id === id),
  getOrderItems: (orderId) => orderItems.filter((oi) => oi.order_id === orderId),
};
