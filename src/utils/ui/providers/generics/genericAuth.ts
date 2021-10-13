export abstract class GenericAuth {
  constructor() {
    this.updateConfig()
  }

  public abstract get loggedIn(): boolean

  /**
   * Login auth handler for provider
   * @returns Promise returned after login event is completed 
   */
  public abstract login(): Promise<any>

  /**
   * Sign out handler for provider
   * @returns Promise returned after sign out event is completed
   */
  public abstract signOut(): Promise<void>

  /**
   * Updates config before calling login
   * Method can be used to update config last moment before login
   */
  public abstract updateConfig(): Promise<boolean>

  /**
   * Gets user details from the provider
   * @returns username as string
   */
  public abstract getUserDetails(): Promise<string | undefined>
}