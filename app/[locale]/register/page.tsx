import { redirect } from 'next/navigation'

// La registrazione avviene direttamente nella pagina /login (tab "Iscriviti")
// Questo redirect evita pagine zombie non collegate all'i18n
export default function RegisterPage() {
  redirect('/login')
}
