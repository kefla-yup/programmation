import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Race, ConfigPoids, ConfigPrix, Lot, Mortalite,
  Oeuf, StockOeuf, Transformation, StockItem
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // Races
  getRaces(): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.baseUrl}/races`);
  }

  addRace(data: Partial<Race>): Observable<Race> {
    return this.http.post<Race>(`${this.baseUrl}/races`, data);
  }

  deleteRace(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/races/${id}`);
  }

  // Config Poids
  getConfigPoids(raceId?: number): Observable<ConfigPoids[]> {
    let url = `${this.baseUrl}/config-poids`;
    if (raceId) url += `?race_id=${raceId}`;
    return this.http.get<ConfigPoids[]>(url);
  }

  addConfigPoids(data: Partial<ConfigPoids>): Observable<ConfigPoids> {
    return this.http.post<ConfigPoids>(`${this.baseUrl}/config-poids`, data);
  }

  updateConfigPoids(id: number, data: Partial<ConfigPoids>): Observable<ConfigPoids> {
    return this.http.put<ConfigPoids>(`${this.baseUrl}/config-poids/${id}`, data);
  }

  deleteConfigPoids(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/config-poids/${id}`);
  }

  // Config Prix
  getConfigPrix(): Observable<ConfigPrix[]> {
    return this.http.get<ConfigPrix[]>(`${this.baseUrl}/config-prix`);
  }

  saveConfigPrix(data: Partial<ConfigPrix>): Observable<ConfigPrix> {
    return this.http.post<ConfigPrix>(`${this.baseUrl}/config-prix`, data);
  }

  // Lots
  getLots(): Observable<Lot[]> {
    return this.http.get<Lot[]>(`${this.baseUrl}/lots`);
  }

  addLot(data: Partial<Lot>): Observable<Lot> {
    return this.http.post<Lot>(`${this.baseUrl}/lots`, data);
  }

  updateLot(id: number, data: Partial<Lot>): Observable<Lot> {
    return this.http.put<Lot>(`${this.baseUrl}/lots/${id}`, data);
  }

  deleteLot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/lots/${id}`);
  }

  // Oeufs
  getOeufs(): Observable<Oeuf[]> {
    return this.http.get<Oeuf[]>(`${this.baseUrl}/oeufs`);
  }

  getStockOeufs(): Observable<StockOeuf[]> {
    return this.http.get<StockOeuf[]>(`${this.baseUrl}/oeufs/stock`);
  }

  addOeuf(data: Partial<Oeuf>): Observable<Oeuf> {
    return this.http.post<Oeuf>(`${this.baseUrl}/oeufs`, data);
  }

  updateOeuf(id: number, data: Partial<Oeuf>): Observable<Oeuf> {
    return this.http.put<Oeuf>(`${this.baseUrl}/oeufs/${id}`, data);
  }

  deleteOeuf(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/oeufs/${id}`);
  }

  // Transformation
  getTransformations(): Observable<Transformation[]> {
    return this.http.get<Transformation[]>(`${this.baseUrl}/transformation`);
  }

  addTransformation(data: Partial<Transformation>): Observable<{ transformation: Transformation; lot: Lot }> {
    return this.http.post<{ transformation: Transformation; lot: Lot }>(`${this.baseUrl}/transformation`, data);
  }

  deleteTransformation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/transformation/${id}`);
  }

  // Mortalité
  getMortalite(lotId?: number): Observable<Mortalite[]> {
    let url = `${this.baseUrl}/mortalite`;
    if (lotId) url += `?lot_id=${lotId}`;
    return this.http.get<Mortalite[]>(url);
  }

  addMortalite(data: Partial<Mortalite>): Observable<Mortalite> {
    return this.http.post<Mortalite>(`${this.baseUrl}/mortalite`, data);
  }

  updateMortalite(id: number, data: Partial<Mortalite>): Observable<Mortalite> {
    return this.http.put<Mortalite>(`${this.baseUrl}/mortalite/${id}`, data);
  }

  deleteMortalite(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/mortalite/${id}`);
  }

  // Poids Poulet
  getPoidsPoulet(raceId: number, dateDebut: string, dateFin: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/poids-poulet?race_id=${raceId}&date_debut=${dateDebut}&date_fin=${dateFin}`);
  }

  // Stock
  getStock(date?: string): Observable<StockItem[]> {
    let url = `${this.baseUrl}/stock`;
    if (date) url += `?date=${date}`;
    return this.http.get<StockItem[]>(url);
  }
}
