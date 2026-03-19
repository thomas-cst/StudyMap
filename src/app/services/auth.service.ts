import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private sessionLoadedPromise: Promise<void>;
  private sessionLoadedResolve: (() => void) | null = null;

  constructor() {
    const supabaseUrl = 'https://bjkpbzsftztbkurneezq.supabase.co';
    const supabaseKey = 'sb_publishable_w7vbFRPStWM_hnKkuQc3AQ_UcfGpPre';

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
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
        // Ajouter aussi dans 'user' pour que checkIfConnected() le trouve
        localStorage.setItem('user', JSON.stringify({ email: session.user.email }));
        this.currentUserSubject.next(session.user);
        // Synchroniser avec la base de données lors de changements
        if (event === 'SIGNED_IN') {
          this.syncUserWithDatabase(session.user);
        }
      } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('user');
        this.currentUserSubject.next(null);
      }
      
      // Marquer que onAuthStateChange a tiré au moins une fois
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
      // Vérifier si l'utilisateur existe déjà dans la table users
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      // Si l'utilisateur n'existe pas, le créer
      if (!existingUser) {
        await this.supabase
          .from('users')
          .insert([{
            email: user.email,
            password: null // Pas de password pour OAuth
          }]);
        console.log(`User ${user.email} créé dans la base de données`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  }

  /**
   * Inscription par email/mot de passe
   */
  async signUp(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (!error && data.user) {
      await this.syncUserWithDatabase(data.user);
    }
    return { user: data.user ?? null, error };
  }

  /**
   * Connexion par email/mot de passe
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; error: any }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { user: data.user ?? null, error };
  }

  /**
   * Connexion avec Google OAuth
   */
  async loginWithGoogle(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    return { error };
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<{ error: any }> {
    const { error } = await this.supabase.auth.signOut();
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    return { error };
  }

  /**
   * Retourne l'utilisateur actuel
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Retourne true si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Attend que la session Supabase soit chargée
   */
  async ensureSessionLoaded(): Promise<void> {
    return this.sessionLoadedPromise;
  }
}
