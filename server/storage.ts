import { type ScannedFile, type InsertScannedFile, type ScanSession, type InsertScanSession } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Scan Sessions
  createScanSession(session: InsertScanSession): Promise<ScanSession>;
  getScanSession(id: string): Promise<ScanSession | undefined>;
  getAllScanSessions(): Promise<ScanSession[]>;
  updateScanSession(id: string, updates: Partial<ScanSession>): Promise<ScanSession | undefined>;
  
  // Scanned Files
  addScannedFile(file: InsertScannedFile): Promise<ScannedFile>;
  getScannedFilesByScanId(scanId: string): Promise<ScannedFile[]>;
  deleteScannedFilesByScanId(scanId: string): Promise<void>;
  searchScannedFiles(scanId: string, query: string, type?: string): Promise<ScannedFile[]>;
}

export class MemStorage implements IStorage {
  private scanSessions: Map<string, ScanSession>;
  private scannedFiles: Map<string, ScannedFile>;

  constructor() {
    this.scanSessions = new Map();
    this.scannedFiles = new Map();
  }

  async createScanSession(insertSession: InsertScanSession): Promise<ScanSession> {
    const id = randomUUID();
    const session: ScanSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
      status: insertSession.status || "pending",
      totalFiles: insertSession.totalFiles || 0,
      foundFiles: insertSession.foundFiles || 0,
      includeSubdirectories: insertSession.includeSubdirectories ?? true,
      showHiddenFiles: insertSession.showHiddenFiles ?? false,
      selectedLanguages: insertSession.selectedLanguages ?? ["ruby"],
    };
    this.scanSessions.set(id, session);
    return session;
  }

  async getScanSession(id: string): Promise<ScanSession | undefined> {
    return this.scanSessions.get(id);
  }

  async getAllScanSessions(): Promise<ScanSession[]> {
    return Array.from(this.scanSessions.values())
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)); // Most recent first
  }

  async updateScanSession(id: string, updates: Partial<ScanSession>): Promise<ScanSession | undefined> {
    const session = this.scanSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.scanSessions.set(id, updatedSession);
    return updatedSession;
  }

  async addScannedFile(insertFile: InsertScannedFile): Promise<ScannedFile> {
    const id = randomUUID();
    const file: ScannedFile = { ...insertFile, id };
    this.scannedFiles.set(id, file);
    return file;
  }

  async getScannedFilesByScanId(scanId: string): Promise<ScannedFile[]> {
    return Array.from(this.scannedFiles.values()).filter(
      (file) => file.scanId === scanId
    );
  }

  async deleteScannedFilesByScanId(scanId: string): Promise<void> {
    const filesToDelete = Array.from(this.scannedFiles.entries()).filter(
      ([_, file]) => file.scanId === scanId
    );
    
    filesToDelete.forEach(([id]) => {
      this.scannedFiles.delete(id);
    });
  }

  async searchScannedFiles(scanId: string, query: string, type?: string): Promise<ScannedFile[]> {
    const files = await this.getScannedFilesByScanId(scanId);
    
    return files.filter(file => {
      const matchesQuery = query === "" || 
        file.name.toLowerCase().includes(query.toLowerCase()) ||
        file.path.toLowerCase().includes(query.toLowerCase());
      
      const matchesType = !type || type === "All Files" || file.type === type;
      
      return matchesQuery && matchesType;
    });
  }
}

export const storage = new MemStorage();
