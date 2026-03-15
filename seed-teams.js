const db = require('./db');

// 2026 NCAA Tournament Teams - 64 teams organized by region
// These are placeholder teams based on typical top programs.
// Update these with actual tournament selections when announced.
const regions = {
  East: [
    { seed: 1, name: 'Duke Blue Devils', short_name: 'Duke' },
    { seed: 2, name: 'Alabama Crimson Tide', short_name: 'Alabama' },
    { seed: 3, name: 'Marquette Golden Eagles', short_name: 'Marquette' },
    { seed: 4, name: 'Auburn Tigers', short_name: 'Auburn' },
    { seed: 5, name: 'Michigan State Spartans', short_name: 'Mich St' },
    { seed: 6, name: 'BYU Cougars', short_name: 'BYU' },
    { seed: 7, name: 'St. Marys Gaels', short_name: "St Mary's" },
    { seed: 8, name: 'Mississippi State Bulldogs', short_name: 'Miss St' },
    { seed: 9, name: 'Memphis Tigers', short_name: 'Memphis' },
    { seed: 10, name: 'Colorado Buffaloes', short_name: 'Colorado' },
    { seed: 11, name: 'New Mexico Lobos', short_name: 'New Mexico' },
    { seed: 12, name: 'Grand Canyon Antelopes', short_name: 'Gr Canyon' },
    { seed: 13, name: 'Vermont Catamounts', short_name: 'Vermont' },
    { seed: 14, name: 'Morehead State Eagles', short_name: 'Morehead' },
    { seed: 15, name: 'UNC Asheville Bulldogs', short_name: 'Asheville' },
    { seed: 16, name: 'Norfolk State Spartans', short_name: 'Norfolk St' },
  ],
  West: [
    { seed: 1, name: 'Kansas Jayhawks', short_name: 'Kansas' },
    { seed: 2, name: 'Arizona Wildcats', short_name: 'Arizona' },
    { seed: 3, name: 'Baylor Bears', short_name: 'Baylor' },
    { seed: 4, name: 'Purdue Boilermakers', short_name: 'Purdue' },
    { seed: 5, name: 'San Diego State Aztecs', short_name: 'SDSU' },
    { seed: 6, name: 'TCU Horned Frogs', short_name: 'TCU' },
    { seed: 7, name: 'Missouri Tigers', short_name: 'Missouri' },
    { seed: 8, name: 'Florida Atlantic Owls', short_name: 'FAU' },
    { seed: 9, name: 'Northwestern Wildcats', short_name: 'N\'western' },
    { seed: 10, name: 'Utah State Aggies', short_name: 'Utah St' },
    { seed: 11, name: 'NC State Wolfpack', short_name: 'NC State' },
    { seed: 12, name: 'Drake Bulldogs', short_name: 'Drake' },
    { seed: 13, name: 'Iona Gaels', short_name: 'Iona' },
    { seed: 14, name: 'Montana State Bobcats', short_name: 'Montana St' },
    { seed: 15, name: 'Colgate Raiders', short_name: 'Colgate' },
    { seed: 16, name: 'Howard Bison', short_name: 'Howard' },
  ],
  South: [
    { seed: 1, name: 'Houston Cougars', short_name: 'Houston' },
    { seed: 2, name: 'Tennessee Volunteers', short_name: 'Tennessee' },
    { seed: 3, name: 'Kentucky Wildcats', short_name: 'Kentucky' },
    { seed: 4, name: 'North Carolina Tar Heels', short_name: 'UNC' },
    { seed: 5, name: 'Iowa State Cyclones', short_name: 'Iowa St' },
    { seed: 6, name: 'Clemson Tigers', short_name: 'Clemson' },
    { seed: 7, name: 'Texas Longhorns', short_name: 'Texas' },
    { seed: 8, name: 'Wisconsin Badgers', short_name: 'Wisconsin' },
    { seed: 9, name: 'Texas A&M Aggies', short_name: 'Texas A&M' },
    { seed: 10, name: 'Nevada Wolf Pack', short_name: 'Nevada' },
    { seed: 11, name: 'Oregon Ducks', short_name: 'Oregon' },
    { seed: 12, name: 'McNeese Cowboys', short_name: 'McNeese' },
    { seed: 13, name: 'Samford Bulldogs', short_name: 'Samford' },
    { seed: 14, name: 'Oakland Golden Grizzlies', short_name: 'Oakland' },
    { seed: 15, name: 'Longwood Lancers', short_name: 'Longwood' },
    { seed: 16, name: 'Stetson Hatters', short_name: 'Stetson' },
  ],
  Midwest: [
    { seed: 1, name: 'UConn Huskies', short_name: 'UConn' },
    { seed: 2, name: 'Gonzaga Bulldogs', short_name: 'Gonzaga' },
    { seed: 3, name: 'Illinois Fighting Illini', short_name: 'Illinois' },
    { seed: 4, name: 'Creighton Bluejays', short_name: 'Creighton' },
    { seed: 5, name: 'Villanova Wildcats', short_name: 'Villanova' },
    { seed: 6, name: 'South Carolina Gamecocks', short_name: 'S Carolina' },
    { seed: 7, name: 'Dayton Flyers', short_name: 'Dayton' },
    { seed: 8, name: 'Florida Gators', short_name: 'Florida' },
    { seed: 9, name: 'Washington State Cougars', short_name: 'Wash St' },
    { seed: 10, name: 'Pittsburgh Panthers', short_name: 'Pitt' },
    { seed: 11, name: 'Colorado State Rams', short_name: 'Colo St' },
    { seed: 12, name: 'James Madison Dukes', short_name: 'JMU' },
    { seed: 13, name: 'Akron Zips', short_name: 'Akron' },
    { seed: 14, name: 'Grambling State Tigers', short_name: 'Grambling' },
    { seed: 15, name: 'Northern Kentucky Norse', short_name: 'NKU' },
    { seed: 16, name: 'Wagner Seahawks', short_name: 'Wagner' },
  ],
};

function seedTeams() {
  const existingCount = db.prepare('SELECT COUNT(*) as cnt FROM teams').get().cnt;
  if (existingCount > 0) {
    console.log(`Teams already seeded (${existingCount} teams). Skipping.`);
    return;
  }

  const insert = db.prepare(
    'INSERT INTO teams (name, seed, region, short_name) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (const [region, teams] of Object.entries(regions)) {
      for (const team of teams) {
        insert.run(team.name, team.seed, region, team.short_name);
      }
    }
  });

  insertMany();
  console.log('Seeded 64 teams across 4 regions.');

  // Create first round matchups (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15)
  const matchupSeeds = [
    [1, 16], [8, 9], [5, 12], [4, 13],
    [6, 11], [3, 14], [7, 10], [2, 15]
  ];

  const insertGame = db.prepare(
    'INSERT OR IGNORE INTO tournament (round, game_number, region, team1_id, team2_id, status) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const getTeam = db.prepare(
    'SELECT id FROM teams WHERE region = ? AND seed = ?'
  );

  const createMatchups = db.transaction(() => {
    let gameNum = 1;
    const regionNames = ['East', 'West', 'South', 'Midwest'];
    for (const region of regionNames) {
      for (const [seed1, seed2] of matchupSeeds) {
        const team1 = getTeam.get(region, seed1);
        const team2 = getTeam.get(region, seed2);
        insertGame.run(1, gameNum, region, team1.id, team2.id, 'pending');
        gameNum++;
      }
    }

    // Create empty slots for rounds 2-6
    // Round 2: 16 games, Round 3 (Sweet 16): 8, Round 4 (Elite 8): 4,
    // Round 5 (Final Four): 2, Round 6 (Championship): 1
    const gamesPerRound = { 2: 16, 3: 8, 4: 4, 5: 2, 6: 1 };
    for (const [round, count] of Object.entries(gamesPerRound)) {
      for (let g = 1; g <= count; g++) {
        let region = null;
        if (round <= 4) {
          const regionIndex = Math.floor((g - 1) / (count / 4));
          region = regionNames[regionIndex] || null;
        }
        insertGame.run(parseInt(round), g + (round == 2 ? 32 : 0), region, null, null, 'pending');
      }
    }
  });

  createMatchups();
  console.log('Created tournament bracket matchups.');
}

seedTeams();

module.exports = { seedTeams, regions };
