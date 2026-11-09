/**
 * Drapeaux du sélecteur de langue.
 * Les images sont importées (et non référencées par URL) pour que Vite les
 * inclue dans le bundle : `src/` n'est pas servi tel quel en production.
 */
import eng from './eng.png';
import fra from './fra.png';
import deu from './deu.png';
import esp from './esp.png';
import ara from './ara.png';

export const FLAGS = { eng, fra, deu, esp, ara };
