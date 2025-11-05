import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-4xl font-light text-gray-100 mb-4">CRM System</h1>
        <p className="text-gray-400 mb-10 text-lg">Gerencie seus contatos e equipe</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="bg-gray-100 text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="bg-gray-800 text-gray-100 px-8 py-3 rounded-lg font-medium border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>
    </div>
  )
}
