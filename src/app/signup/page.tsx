'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'Owner' | 'Manager' | 'Seller'>('Seller')
  const [managerId, setManagerId] = useState('')
  const router = useRouter()

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, manager_id: role === 'Seller' ? managerId : null }
      }
    })

    if (error) alert(error.message)
    else {
      alert('Cadastro feito! Confirme seu email.')
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-lg w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-light text-gray-100 mb-2">Criar Conta</h1>
          <p className="text-sm text-gray-400">Registre-se no sistema</p>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              placeholder="seu@email.com"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
            <input
              placeholder="Mínimo 6 caracteres"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Cargo</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-gray-600 transition-colors"
            >
              <option value="Seller">Vendedor</option>
              <option value="Manager">Gerente</option>
              <option value="Owner">Dono</option>
            </select>
          </div>
          {role === 'Seller' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">ID do Gerente (UUID)</label>
              <input
                placeholder="UUID do gerente"
                value={managerId}
                onChange={e => setManagerId(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
              />
            </div>
          )}
          <button
            onClick={handleSignup}
            className="w-full bg-gray-100 text-black p-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cadastrar
          </button>
          <p className="text-center text-gray-400 text-sm">
            Já tem conta?{' '}
            <a href="/login" className="text-gray-200 font-medium hover:underline">
              Entrar
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}