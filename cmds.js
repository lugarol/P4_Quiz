const {log, biglog, errorlog, colorize} = require("./out");

const model = require('./model');

/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.helpCmd = function (rl) {
    log("Comandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Lista los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log("  add - Añade un nuevo quiz interactivamente.");
    log("  delete <id> - Borra el quiz indicado.");
    log("  edit <id> - Edita el quiz indicado.");
    log("  test <id> - Prueba el quiz indicado.");
    log("  p|play - Juega a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};

/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.listCmd = function (rl) {
    model.getAll().forEach((quiz, id) => {
        log(`  [${colorize(id, 'magenta')}]: ${quiz.question}`);
    });
    rl.prompt();
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.showCmd = function(rl, id) {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id`);
    } else {
        try {
            const quiz = model.getByIndex(id);
            log (`  [${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        } catch (error) {
            errorlog(error.message);
        }
    }
    rl.prompt();
};

/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y la respuesta.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en el callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.addCmd = function(rl) {
    rl.question(colorize(' Introduzca una pregunta: ', 'red'), (question) => {
        rl.question(colorize(' Introduzca una respuesta ', 'red'), (answer) => {
            model.add(question, answer);
            log(`${colorize(' Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
            rl.prompt();
        });
    });
};

/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = function(rl, id) {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id`);
    } else {
        try {
            model.deleteByIndex(id);
        } catch (error) {
            errorlog(error.message);
        }
    }
    rl.prompt();
};

/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en el callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = function(rl, id) {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            rl.question(colorize(' Introduzca una pregunta: ', 'red'), (question) => {
                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                rl.question(colorize(' Introduzca una respuesta ', 'red'), (answer) => {
                    model.update(id, question, answer);
                    log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a probar.
 */
exports.testCmd = function(rl, id) {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);
            rl.question(`${colorize(quiz.question, 'red')}${colorize('?', 'red')} `, (answer) => {
                if (answer.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                    log(`Correcto`);
                    biglog('Correcto', 'green');
                } else {
                    log(`Incorrecto`);
                    biglog('Incorrecto', 'red');
                }
                rl.prompt();
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.playCmd = function(rl) {
    let score = 0;
    let quizzes = model.getAll();

    const playOne = () => {
        if (quizzes.length === 0) {
            log('No hay nada más que preguntar');
            fin();
            rl.prompt();
        } else {
            let id = Math.floor(Math.random() * quizzes.length);
            let quiz = quizzes[id];
            rl.question(colorize(quiz.question + '? ', 'red'), (answer) => {
                let raw = `^${quiz.answer}$`;
                let respuesta = new RegExp(raw, 'gim');
                if (respuesta.test(answer)) {
                    score++;
                    let aciertos = (score >= 2) ? "aciertos" : "acierto";
                    log(`CORRECTO - Lleva ${score} ${aciertos}.`);
                    quizzes.splice(id, 1);
                    playOne();
                } else {
                    log (`INCORRECTO. La respuesta correcta era: ${colorize(quiz.answer, 'magenta')}`);
                    fin();
                    rl.prompt();
                }
            });
        }
    };

    const fin = () => {
        log(`Fin del examen. Aciertos:`);
        biglog(score, 'magenta');
    }

    playOne();
};

/* 
exports.playCmd = function(rl) {
    let score = 0;
    let toBeResolved = [];
    let quizzes = model.getAll();
    for (let i = 0; i < quizzes.length; i++) {
        toBeResolved.push(i);
    }

    const playOne = () => {
        if (toBeResolved.length === 0) {
            log('No hay nada más que preguntar');
            fin();
            rl.prompt();
        } else {
            let id = Math.floor((Math.random() * toBeResolved.length));
            let quiz = quizzes[id];
            rl.question(`${colorize(quiz.question, 'red')}${colorize('?', 'red')} `, (answer) => {
                if (answer.trim().toLowerCase() === quiz.answer.toLowerCase()) {
                    score++;
                    log(`CORRECTO - Lleva ${score} acierto/s.`);
                    toBeResolved.splice(id, 1);
                    quizzes.splice(id, 1);
                    playOne();
                } else {
                    log (`INCORRECTO.`);
                    fin();
                    rl.prompt();
                }
            });
        }
    };

    const fin = () => {
        log(`Fin del examen. Aciertos:`);
        biglog(score, 'magenta');
    }

    playOne();
};
*/

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.creditsCmd = function(rl) {
    log('Autores de la práctica');
    log('Eros García Arroyo', 'green');
    log('Luis García Olivares', 'green');
    rl.prompt();
};

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd = function(rl) {
    rl.close();
};