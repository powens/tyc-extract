const BCP_BASE_URL = "https://lrs9glzzsf.execute-api.us-east-1.amazonaws.com/prod";

// BCP event ID
const EVENT_ID = "AAaqpOQY1c";

// Spreadsheet headers
const headers = ['Name', 'Faction', 'Battle Points', 'Wins', 'Battle Points SoS', 'Wins Extended SoS', 'Opponent 1', 'Opponent 2', 'Opponent 3', 'Opponent 4', 'Opponent 5'];


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
  const playersUrl = `${BCP_BASE_URL}/players?eventId=${eventId}&inclEvent=false&inclMetrics=true&inclArmies=true&inclTeams=true&limit=1200&metrics=[%22resultRecord%22,%22record%22,%22numWins%22,%22battlePoints%22,%22WHArmyPoints%22,%22numWinsSoS%22,%22FFGBattlePointsSoS%22,%22mfSwissPoints%22,%22pathToVictory%22,%22mfStrengthOfSchedule%22,%22marginOfVictory%22,%22extendedNumWinsSoS%22,%22extendedFFGBattlePointsSoS%22,%22_id%22]`
  const playersRsponse = UrlFetchApp.fetch(playersUrl);
  const players = JSON.parse(playersRsponse.getContentText());
  return players;
}

// Get the event pairings for eventId
function getPairings(eventId) {
  const pairingsUrl = `${BCP_BASE_URL}/pairings?eventId=${EVENT_ID}&sortField=round&smallGame=true`
  const pairingsResponse = UrlFetchApp.fetch(pairingsUrl);
  const pairings = JSON.parse(pairingsResponse.getContentText());
  return pairings;
}

// Extracts the pairings for a player
function getPairingsForPlayer(player, pairings) {
  const playerId = player["userId"];
  
  // Find pairings for player
  const playerPairings = pairings.filter((pairing) => {
    return (playerId === pairing?.player1?.userId) || (playerId === pairing?.player2?.userId);
  });
  playerPairings.sort((a, b) => a?.round - b?.round);
  return playerPairings;
}

// Helper function to get the name from a player
function getNameFromPlayer(player) {
  return `${player?.firstName ?? ''} ${player?.lastName ?? ''}`;
}


// Main function
function fillOutPlayers() {
  const players = getPlayers(EVENT_ID);
  const pairings = getPairings(EVENT_ID);

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
      player?.army?.name ?? 'Unknown',
      player?.battlePoints ?? 0,
      player?.numWins ?? 0,
      player?.FFGBattlePointsSoS ?? 0,
      player?.extendedNumWinsSoS ?? 0,
    ];

    playerPairings.forEach((pairing) => {
      const player1 = pairing?.player1;
      const player2 = pairing?.player2;

      if (!player1 || !player2) {
        rowData.push('BYE');
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
