import BaseShip from './BaseShip.js';
import Sloop from './Sloop.js';
import WakeParticleSystem from './WakeParticleSystem.js';

// Export all ship types and related classes
export {
    BaseShip,
    Sloop,
    WakeParticleSystem
};

// Export Sloop as the default ship type for backward compatibility
export default Sloop; 