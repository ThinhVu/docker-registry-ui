export const BE_URL = process.env.NODE_ENV === 'production' ? process.env.API_URL || 'https://controller-ytbot.tvux.me' : 'http://localhost:3000';
export const API_URL = `${BE_URL}/api`
 
