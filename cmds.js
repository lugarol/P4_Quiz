const {log, biglog, errorlog, colorize} = require("./out");

const Sequelize = require('sequelize');
const {models} = require('./model');

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
exports.listCmd = (rl) => {
    models.quiz.findAll()
    /*
    .then(quizzes => {
        quizzes.forEach(quiz => {
            log(`  [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
        });
    })
    // equivalente a lo de abajo, que usa promesas Bluebird
    */
    .each(quiz => {
        log(`  [${colorize(quiz.id, 'magenta')}]:  ${quiz.question}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Esta función devuelve una promesa que:
 *  - valida que se ha introducido un valor para el parámetro
 *  - convierte el parámetro en un número entero
 * Si todo va bien, la promesa se satisface y devuelve el valor de id a usar
 * 
 * @param id Parámetro con el índice a validar.
 */
const validateId = (id) => {
    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === 'undefined') {
            reject(new Error(`Falta el parámetro <id>`));
        } else {
            id = parseInt(id);  // coge la parte entera
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.showCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}`);
        }
        log(`  [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize(`=>`, 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Esta función convierte la llamada rl.question, que está basada en callbacks, en una 
 * basada en promesas.
 * 
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido
 * Entonces la llamada a then que hay que hacer la promesa devuelta será:
 *          .then(answer => {...})
 * 
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y final
 * 
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta que hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
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
exports.addCmd = (rl) => {
    return makeQuestion(rl, `Introduzca una pregunta: `)
    .then(q => {
        return makeQuestion(rl, `Introduzca la respuesta: `)
        .then(a => {
            return {question: q, answer: a};
        });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then(quiz => {
        log(`  ${colorize(`Se ha añadido`, 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(`El quiz es erróneo`);
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
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
exports.editCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}`);
        }
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
        return makeQuestion(rl, 'Introduzca la pregunta: ')
        .then(q => {
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
            return makeQuestion(rl, 'Introduzca la respuesta: ')
            .then(a => {
                quiz.question = q;
                quiz.answer = a;
                return quiz;
            });
        });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(`  Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erróneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI
 * @param id Clave del quiz a probar.
 */
exports.testCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}`);
        }
        return makeQuestion(rl, `${colorize('¿', 'red')}${colorize(quiz.question, 'red')}${colorize('?', 'red')} `)
        .then(answer => {
            if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                log(`Correcto`);
                biglog('Correcto', 'green');
            } else {
                log(`Incorrecto`);
                biglog('Incorrecto', 'red');
            }
            // rl.prompt();
        });
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        rl.prompt();
    });
};

/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.playCmd = (rl) => {
    let score = 0;
    let toBePlayed = [];

    const playOne = () => {
        return new Promise((resolve, reject) => {
            if (toBePlayed.length <= 0) {
                log(`No hay nada más que preguntar.`);
                //fin();
                resolve();
                return;
            }
            let pos = Math.floor(Math.random() * toBePlayed.length);
            let quiz = toBePlayed[pos];
            toBePlayed.splice(pos, 1);

            return makeQuestion(rl, `¿${quiz.question}? `)
            .then(answer => {
                if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                    score++;
                    let aciertos = (score >= 2) ? "aciertos" : "acierto";
                    log(`CORRECTO - Lleva ${score} ${aciertos}.`);
                    resolve(playOne());
                } else {
                    log (`INCORRECTO. La respuesta correcta era: ${colorize(quiz.answer, 'magenta')}`);
                    //fin();
                    resolve();
                }
            });
        });
    };

    models.quiz.findAll({raw: true})
    .then(quizzes => {
        toBePlayed = quizzes;
    })
    .then(() => {
        return playOne();
    })
    .catch(error => {
        errorlog(error.message);
    })
    .then(() => {
        fin();
        rl.prompt();
    });

    const fin = () => {
        log(`Fin del juego. Aciertos:`);
        biglog(score, 'magenta');
    };
};

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.creditsCmd = function(rl) {
    return new Promise((resolve, reject) => {
        log('Autores de la práctica');
        log('Eros García Arroyo', 'green');
        log('Luis García Olivares', 'green');
        rl.prompt();
        resolve();
    });
};

/**
 * Muestra los nombres de los autores de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI
 */
exports.quitCmd = function(rl) {
    rl.close();
};