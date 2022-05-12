const resources = {
  en: {
    translation: {
      gameCreated: {
        ok: "A new game has been {{gameDateTime}}\n\nMaximum number of players: {{requiredPlayers}}\n\nRSVP by sending any of the below commands:\n/yes if you are planning to attend.\n/no if you can't make it.\n/maybe if you are not sure.\n\nYour responses can be changed later at any time.\n\nTo check the attendance of players, please use the /status command.\n\nTo add or remove guest players, use /guest_add and /guest_remove commands.",
        notEnoughArgs:
          "There are no enough arguments in /new command.\nUsage: /new YYYY-MM-DD HH:MM MAX",
      },
      enrollReminder: `Each player needs to send the /enroll command to let the bot know they want to interact with it. This needs to be done just once per user.`,
      initialized: {
        notEnoughArgs:
          "There are no enough arguments in /init command.\n\nUsage:\n/init en \nfor English\n\n/init es \npara Español",
        invalidLanguage:
          "Unsupported language.\n\nUsage:\n/init en \nfor English\n\n/init es \npara Español",
        ok: `Hello there! This group is now ready to use {{robotName}} ({{environmentName}}).\n\n$t(enrollReminder)`,
        already:
          "{{robotName}} ({{environmentName}}) is already initialized for current group.\n\n$t(enrollReminder)",
      },
      enroll: {
        ok: "User '{{firstName}}' has been enrolled.",
        already:
          "User '{{firstName}}' was enrolled already. /enroll is a one-off action for each user.",
      },
      rsvp: {
        ok: "User '{{firstName}}' said '{{rsvpOption}}'.",
      },
      status: {
        main: `Game {{gameDateTime}}\n\nGoing: {{goingCount}}\nNot going: {{notGoingCount}}\nMaybe: {{maybeCount}}{{detailsSection}} \n\n{{summary}}`,
        playersWithPendingRsvp: "Players with pending RSVP:\n{{unknownList}}",
        allReplied: "All players in this group have replied.",
      },
      guestAdded: {
        notEnoughArgs:
          "There are no enough arguments in /guest_add command.\n\nUsage: /guest_add <name>`",
        ok: "Guest '{{guestName}} (#{{guestNumber}})' has been added.",
      },
      guestRemoved: {
        notEnoughArgs:
          "There are no enough arguments in /guest_remove command.\n\nUsage: /guest_remove <number>",
        ok: "Guest '{{guestNumber}}' has been removed.",
      },
      scheduledForDateTimeText: "scheduled for {{value, datetime}}",
      noUpcomingGames: "No upcoming games found for this group.",
      uknownError: {
        initialized: "Something went wrong initializing Bot.",
        enroll:
          "Something went wrong enrolling user. Has the bot being initialized for this group? Send /init and try again.",
        newGame:
          "Something went wrong creating a new game. Has the bot being initialized for this group? Send /init and try again.",
        rsvp: "Something went wrong during RSVP user",
        addGuest: "Something went wrong adding guest.",
        removeGuest: "Something went wrong removing guest.",
      },
    },
  },
  es: {
    translation: {
      gameCreated: {
        ok: "Un nuevo partido ha sido {{gameDateTime}}\n\nNúmero máximo de jugadores: {{requiredPlayers}}\n\nConfirme asistencia enviando alguno de los comandos a continuación:\n/yes si planea asistir.\n/no en caso de que no vaya a asistir.\n/maybe en caso de estar seguro aún.\n\nSus respuestas pueden ser modificadas en cualquier momento antes del partido.\n\nPara conocer la asistencia de los jugadores, use el comando /status\n\nPara agregar o remover jugadores invitados, use los comandos /guest_add y /guest_remove respectivamente.",
        notEnoughArgs:
          "Argumentos insuficientes en la llamada al comando /new\nModo de uso: /new YYYY-MM-DD HH:MM MAX",
      },
      enrollReminder: `Cada jugador debe enviar el comando /enroll para indicar que desean interactuar con el bot. Esto es necesario solo una vez por cada usuario.`,
      initialized: {
        notEnoughArgs:
          "There are no enough arguments in /init command.\n\nUsage:\n/init en \nfor English\n\n/init es \npara Español",
        invalidLanguage:
          "Unsupported language.\n\nUsage:\n/init en \nfor English\n\n/init es \npara Español",
        ok: `Hola! Este grupo esta listo para usar {{robotName}} ({{environmentName}}).\n\n$t(enrollReminder)`,
        already:
          "{{robotName}} ({{environmentName}}) ya ha sido initializado en este grupo.\n\n$t(enrollReminder)",
      },
      enroll: {
        ok: "El usuario '{{firstName}}' ha sido enrolado.",
        already:
          "El usuario '{{firstName}}' ya ha sido enrolado con anterioridad. El comando /enroll es necesario una única vez para cada usuario.",
      },
      rsvp: {
        ok: "El usuario '{{firstName}}' dijo '{{rsvpOption}}'.",
      },
      status: {
        main: `Partido {{gameDateTime}}\n\nVienen: {{goingCount}}\nNo vienen: {{notGoingCount}}\nA confirmar: {{maybeCount}}{{detailsSection}} \n\n{{summary}}`,
        playersWithPendingRsvp:
          "Jugadores que no han respondido:\n{{unknownList}}",
        allReplied: "Todos los jugadores en este grupo han respondido",
      },
      guestAdded: {
        notEnoughArgs:
          "Argumentos insuficientes en la llamada al comando /guest_add\n\nModo de Uso: /guest_add <name>`",
        ok: "El invitado '{{guestName}} (#{{guestNumber}})' ha sido agregado.",
      },
      guestRemoved: {
        notEnoughArgs:
          "Argumentos insuficientes en la llamada al comando /guest_remove\n\nModo de Uso: /guest_remove <number>",
        ok: "El invitado '{{guestNumber}}' ha sido removido.",
      },
      scheduledForDateTimeText: "agendado para el {{value, datetime}} hs.",
      noUpcomingGames: "No hay partidos próximos en este grupo.",
      uknownError: {
        initialized: "Error desconocido inicializando el bot.",
        enroll:
          "Error desconocido enrolando usuario. ¿Ya ha sido inicializado el bot en este grupo? Envíe el comando /init e intentelo nuevamente.",
        newGame:
          "Error desconocido creando un nuevo partido. ¿Ya ha sido inicializado el bot en este grupo? Envíe el comando /init e intentelo nuevamente.",
        rsvp: "Error desconocido enviando RSVP.",
        addGuest: "Error desconocido agregando invitado.",
        removeGuest: "Error desconocido removiendo invitado.",
      },
    },
  },
};

export default resources;
