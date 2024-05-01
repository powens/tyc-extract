const BCP_BASE_URL = "https://newprod-api.bestcoastpairings.com/v1";
const HEADERS = {
  "client-id": "259e2q22frfasni9dtjb9q3i7a",
};

const EXAMPLE_EVENT_ID = "L34UKBEBK0";

// Spreadsheet headers
const headers = [
  "Name",
  "Faction",
  "Battle Points",
  "Wins",
  "Battle Points SoS",
  "Wins Extended SoS",
  "Opponent 1",
  "Opponent 2",
  "Opponent 3",
  "Opponent 4",
  "Opponent 5",
];

// Sort function for player list
// Current sort: numWins, battlePoints
function comparePlayers(a, b) {
  const aWins = a?.numWins ?? 0;
  const bWins = b?.numWins ?? 0;
  if (aWins > bWins) {
    return -1;
  } else if (aWins < bWins) {
    return 1;
  } else {
    const aBp = a?.battlePoints ?? 0;
    const bBp = b?.battlePoints ?? 0;
    if (aBp > bBp) {
      return -1;
    } else if (aBp < bBp) {
      return 1;
    }
  }
  return 0;
}

// Get players for eventId
function getPlayers(eventId) {
  const playersUrl = `${BCP_BASE_URL}/players?limit=100&eventId=${eventId}&expand[]=army&expand[]=subFaction&expand[]=character&expand[]=team&expand[]=use`;
  const playersRsponse = UrlFetchApp.fetch(playersUrl, { headers: HEADERS });
  const players = JSON.parse(playersRsponse.getContentText());
  return players["data"];
}

// Get the event pairings for eventId
function getPairings(eventId) {
  const pairingsUrl = `${BCP_BASE_URL}/pairings?eventId=${eventId}&limit=500&pairingType=Pairing&expand%5B%5D=player1&expand%5B%5D=player2&expand%5B%5D=player1Game&expand%5B%5D=player2Game`;
  const pairingsResponse = UrlFetchApp.fetch(pairingsUrl, { headers: HEADERS });
  const pairings = JSON.parse(pairingsResponse.getContentText());
  return pairings["data"];
}

// Extracts the pairings for a player
function getPairingsForPlayer(player, pairings) {
  const playerId = player["userId"];

  // Find pairings for player
  const playerPairings = pairings.filter((pairing) => {
    return (
      playerId === pairing?.player1?.userId ||
      playerId === pairing?.player2?.userId
    );
  });
  playerPairings.sort((a, b) => a?.round - b?.round);
  return playerPairings;
}

// Helper function to get the name from a player
function getNameFromPlayer(player) {
  return `${player?.firstName ?? ""} ${player?.lastName ?? ""}`;
}

// Main function
function injectPlayersForEvent(eventId) {
  const players = getPlayers(eventId);
  const pairings = getPairings(eventId);

  players.sort(comparePlayers);

  // Write the sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Write the column headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  players.forEach((player, i) => {
    const ranking = i + 1;
    const row = i + 2;
    const playerPairings = getPairingsForPlayer(player, pairings);
    const rowData = [
      getNameFromPlayer(player),
      player?.army?.name ?? "Unknown",
      player?.battlePoints ?? 0,
      player?.numWins ?? 0,
      player?.FFGBattlePointsSoS ?? 0,
      player?.extendedNumWinsSoS ?? 0,
    ];

    playerPairings.forEach((pairing) => {
      const player1 = pairing?.player1;
      const player2 = pairing?.player2;

      if (!player1 || !player2) {
        rowData.push("BYE");
      } else if (player1?.userId == player?.userId) {
        rowData.push(getNameFromPlayer(player2));
      } else if (player2?.userId === player?.userId) {
        rowData.push(getNameFromPlayer(player1));
      } else {
        rowData.push("??? THIS SHOULDNT HAPPEN");
      }
    });

    sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
  });
}
