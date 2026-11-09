# Drakensang Optimizer

Live site : http://drakensang.optimizer.free.fr

After noticing on forums questions often related to choosing an equipement over another, i decided to implement an online tool to help with such decisions.

The tool is built with AngularJS v1.x (no JQuery) for the front-end,
PHP5.3 for the back-end, and MySQL database hosted on Free.fr free server.

Features :
- calculates the Damage Per Second (DPS) based on stats of chosen equipements. The formula used is :
  DPS = AttackSpeed x [ (1 - CritRate%) x MeanBaseDamage + CriteRate% x (MeanBaseDamage x CriticalDamageBoost%) ]
- allows you to virtually test any equipement in the game. /!\ IMPORTANT NOTE: those equipements are virtual and have no connection with real equipements in the game ! Keep in mind this tool is a simulator, not a hack !
- allows you to simulate custom equipement with the builtin editor. The editor name field has an autocomplete directly connected to database, allowing you to import a known equipement's stats and then build your custom item on top of it. Note: custom equipements arenot saved in database.
- allows you to save your "builds" into profiles on your local drive, then load them later. This includes custom equipements.
  Security notice: those profiles are txt files containing only one JSON object, listing all needed stats for next onsite reload, script-free.
- you can compare multiple builds through multiple browser tabs/windows.
- currently translated in 4 languages, switchable on-the-fly: French, English, Deutch, and Spanish. I'm aware there is popular demand for Arabic and chinese. At loading time, language will auto-detect and use your browser's locale lang.
