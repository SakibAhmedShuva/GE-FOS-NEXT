#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) { if (!fs.existsSync(dir)) return out; for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) walk(full, out); else out.push(full); } return out; }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { return { __error: error.message }; } }
function csvCount(file) { if (!fs.existsSync(file)) return 0; const text = fs.readFileSync(file, 'utf8').trim(); return text ? Math.max(text.split(/\r?\n/).length - 1, 0) : 0; }

const sourceRoot = process.argv[2] || process.env.LEGACY_FOS_ROOT || process.cwd();
const projectsDir = path.join(sourceRoot, 'data_storage', 'projects');
const exportsDir = path.join(sourceRoot, 'data_storage', 'FOS');
const coversDir = path.join(sourceRoot, 'assets', 'covers');
const chatAttachmentsDir = path.join(sourceRoot, 'data_storage', 'chat_attachments');
const projectFiles = walk(projectsDir).filter((file) => file.endsWith('.json'));
const projects = projectFiles.map((file) => ({ file, json: readJson(file) }));
const references = new Map();
for (const project of projects) { const ref = project.json.reference_number || project.json.referenceNumber || project.json.ref || path.basename(project.file, '.json'); if (!references.has(ref)) references.set(ref, []); references.get(ref).push(project.file); }
const exportFiles = walk(exportsDir).filter((file) => /\.(pdf|xlsx)$/i.test(file));
const covers = walk(coversDir).filter((file) => /\.pdf$/i.test(file));
const chatAttachments = walk(chatAttachmentsDir);
const unmatchedExports = exportFiles.filter((file) => { const base = path.basename(file).toLowerCase(); return ![...references.keys()].some((ref) => base.includes(String(ref).toLowerCase().replace(/[^a-z0-9]/g, '')) || base.includes(String(ref).toLowerCase())); });
const malformedProjects = projects.filter((project) => project.json.__error);
const duplicateReferences = [...references.entries()].filter(([, files]) => files.length > 1).map(([reference, files]) => ({ reference, files }));
const report = { sourceRoot, generatedAt: new Date().toISOString(), counts: { projects: projectFiles.length, generatedExports: exportFiles.length, covers: covers.length, chatAttachments: chatAttachments.length, clients: csvCount(path.join(sourceRoot, 'data_storage', 'clients.csv')), users: csvCount(path.join(sourceRoot, 'authorization', 'users.csv')), notifications: csvCount(path.join(sourceRoot, 'data_storage', 'notifications.csv')), reviewRequests: csvCount(path.join(sourceRoot, 'data_storage', 'review_requests.csv')), projectShares: csvCount(path.join(sourceRoot, 'data_storage', 'project_shares.csv')), chatHistory: csvCount(path.join(sourceRoot, 'data_storage', 'chat_history.csv')) }, warnings: { unmatchedGeneratedExports: unmatchedExports.map((file) => path.relative(sourceRoot, file)), malformedProjects: malformedProjects.map((project) => ({ file: path.relative(sourceRoot, project.file), error: project.json.__error })), duplicateReferences } };
const outFile = path.join(process.cwd(), 'migration-final-verification-report.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.error(`Wrote ${outFile}`);
