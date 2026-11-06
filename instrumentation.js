export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const { startMailScheduler } = await import('./app/lib/mailScheduler');
    startMailScheduler();
}
