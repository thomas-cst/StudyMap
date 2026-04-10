/**
 * Service d'authentification - Gere la connexion/inscription via Supabase
 */
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
// Importation de l'environnement (le chemin peut varier selon ta structure)
import { environment } from '../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Client Supabase pour les appels d'authentification */
  private supabase: SupabaseClient;
  /** BehaviorSubject contenant l'utilisateur connecte (null si deconnecte) */
  private currentUserSubject: BehaviorSubject<User | null>;
  /** Observable public pour que les composants reagissent aux changements d'auth */
  public currentUser$: Observable<User | null>;
  /** Promise qui se resout quand la session Supabase est entierement chargee */
  private sessionLoadedPromise: Promise<void>;
  /** Fonction de resolution de la promise de chargement de session */
  private sessionLoadedResolve: (() => void) | null = null;

  constructor() {
    // Utilisation des variables de l'environnement
    // Note : TypeScript ne râlera plus car les propriétés sont définies dans l'objet environment
    this.supabase = createClient(
      environment.supabaseUrl, 
      environment.supabaseKey
    );

    // Initialiser l'utilisateur actuel
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Créer une promise qui se resolve quand la session est chargée
    this.sessionLoadedPromise = new Promise((resolve) => {
      this.sessionLoadedResolve = resolve;
    });

    // Vérifier la session actuelle
    this.checkCurrentUser();
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  private checkCurrentUser(): void {
    // D'abord vérifier la session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        localStorage.setItem('currentUser', JSON.stringify(session.user));
        this.currentUserSubject.next(session.user);
        this.syncUserWithDatabase(session.user);
      }
    });

    // Écouter les changements d'authentification
    let authStateChanged = false;
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.setItem('currentUser', JSON.stringify(session.user));
        localStorage.setItem('user', JSON.stringify({ email: session.user.email }));
        this.currentUserSubject.next(session.user);
        if (event === 'SIGNED_IN') {
          this.syncUserWithDatabase(session.user);
        }
      } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
      }
      
      if (!authStateChanged) {
        authStateChanged = true;
        if (this.sessionLoadedResolve) {
          this.sessionLoadedResolve();
        }
      }
    });
  }

  /**
   * Synchronise l'utilisateur OAuth avec la table users
   */
  async syncUserWithDatabase(user: User): Promise<void> {
    try {
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!existingUser) {
        await this.supabase
          .from('users')
          .insert([{
            email: user.email,
            password: null 
          }]);
        console.log(`User ${user.email} créé dans la base de données`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  }

  /**
   * Inscrit un nouvel utilisateur avec email et mot de passe
   * @param email - Adresse email du nouvel utilisateur
   * @param password - Mot de passe choisi (doit respecter les contraintes Supabase)
   * @returns L'utilisateur cree et une eventuelle erreur
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await this.syncUserWithDatabase(data.user);
    }
    return { user: data.user ?? null, error };
  }

  /**
   * Connecte un utilisateur existant avec email et mot de passe
   * @param email - Adresse email de l'utilisateur
   * @param password - Mot de passe de l'utilisateur
   * @returns L'utilisateur connecte et une eventuelle erreur
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { user: data.user ?? null, error };
  }

  /**
   * Initie la connexion OAuth via Google (redirige vers la page Google)
   * @returns Une eventuelle erreur si l'initialisation OAuth echoue
   */
  async loginWithGoogle(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  }

  /**
   * Deconnecte l'utilisateur (Supabase + suppression du cache localStorage)
   * @returns Une eventuelle erreur si la deconnexion echoue
   */
  async logout(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    return { error };
  }

  /** Retourne l'utilisateur actuellement connecte, ou null s'il n'y en a pas */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /** Retourne true si un utilisateur est connecte */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Attend que la session Supabase soit completement chargee avant de continuer.
   * Utile pour eviter les conditions de course au demarrage de l'application.
   */
  async ensureSessionLoaded(): Promise<void> {
    return this.sessionLoadedPromise;
  }
}