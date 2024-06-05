// --------worker.js 

import { Worker, parentPort } from 'node:worker_threads';

// eslint-disable-next-line unicorn/no-static-only-class
export default class WorkerManager {
    static async useWorker(filepath, dataInjected) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(filepath, dataInjected);

            worker.on('online', () => {
                console.log('================= Launching intensive CPU task');
            });

            worker.on('message', dataReturned => {
                resolve(dataReturned);
            })

            worker.on('error', (err) => reject(err));

            worker.on('exit', code => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }

                console.log('================== EXIT');
            })
        })
    }
}

// -------------------------------------------------

// ----------- utilisation 
async calculateUserPercentPromise(userId, fromId) {
    const user = await this.model.user_findPromise(userId);
    const files = await this.documents_userPromise(userId, fromId);

    const { percent, totalPJ, totalPJNeed } =
    await WorkerManager.useWorker(`${__dirname}/addUserWorker.js`,
        { workerData: { user, files } });

    return { percent, totalPJ, totalPJNeed };
}

// -------------------fichier lu par le worker
import { Worker, parentPort, workerData } from 'node:worker_threads';

(function AddUserWorker({user, files}) {
    let total = 1;
    let nb = 1;

    if (user.garantType != 'user.garant.organisme') {
        if (user.civility) nb++;
        total++;

        if (user.firstName) nb++;
        total++;

        if (user.lastName) nb++;
        total++;

        if (user.email) nb++;
        total++;

        if (user.phone) nb++;
        total++;

        if (
            user.etablissement ||
            user.fonction ||
            user.profession ||
            user.situation ||
            user.activiteDebut ||
            user.activiteFin ||
            user.essaiFin ||
            user.debut
        )
            nb++;
        total++;

        if (user.nationality) nb++;
        total++;

        if (user.revenu) nb++;
        total++;
    }

    // si le compte que l'on test est bien un garant
    if (user.garant && user.garantType != 'user.garant.organisme') {
        if (user.type) nb++;
        total++;
    }
    if (!user.garant) {
        if (user.birthDate) nb++;
        total++;

        if (user.bio) nb++;
        total++;

        if (user.groupe) nb++;
        total++;
    }

    let totalPJNeed = 0;
    let totalPJ = 0;

    for (const j in files[0]) {
        // select files for current user (idx 0)
        if (j === 'types') {
            for (const k in files[0][j]) {
                // ne prend pas en compte le RIB && attest. financ. pour le calcul du pourcentage (et des x / x (pieces jointes))
                if (!['document.type.rib', 'document.type.attestationFinancement'].includes(k)) {
                    if (files[0][j][k].nb === 0) {
                        // total++;
                        totalPJNeed++;
                    } else {
                        // nb++;
                        // total++;
                        totalPJNeed++;
                        totalPJ++;
                    }
                }
            }
        }
    }

    let percent = (nb / total) * 100;
    percent = Math.min(100, percent);

    parentPort.postMessage({ percent, totalPJ, totalPJNeed });
})(workerData);