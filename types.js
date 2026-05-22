/**
 * Shared type definitions for FamilyConnect server
 * 
 * @typedef {Object} JoinData
 * @property {string} userId
 * @property {string} room
 * @property {string} [theme]
 * 
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} room
 * @property {string} userId
 * @property {string} text
 * @property {string} [theme]
 * @property {number} createdAt
 * 
 * @typedef {Object} RoomUser
 * @property {string} userId
 * @property {string} socketId
 * @property {string} [theme]
 * 
 * @typedef {Object} CallData
 * @property {string} from
 * @property {'audio'|'video'} callType
 * 
 * @typedef {Object} SignalData
 * @property {string} to
 * @property {{sdp?: {type: string, sdp: string}, candidate?: object}} signal
 */

module.exports = {};
