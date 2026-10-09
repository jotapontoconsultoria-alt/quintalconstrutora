// Edge Function: gerenciamento de usuários do Kanban de Obras (somente administradores).
// Usa a chave de serviço do próprio Supabase (disponível automaticamente na função),
// então nenhuma chave secreta precisa ser copiada para o site.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const PAPEIS = ['admin', 'editor', 'leitor']

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

function traduzir(mensagem: string) {
  const m = mensagem.toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return 'Já existe um usuário com este e-mail.'
  if (m.includes('password')) return 'Senha inválida. Use pelo menos 8 caracteres.'
  if (m.includes('email')) return 'E-mail inválido.'
  return 'Não foi possível concluir a operação.'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ erro: 'Método não permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Quem está chamando?
  const quem = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: sessao, error: erroSessao } = await quem.auth.getUser()
  const chamador = sessao?.user
  if (erroSessao || !chamador) return json({ erro: 'Sessão inválida. Entre novamente.' }, 401)

  const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false } })

  // Só administradores passam daqui.
  const { data: perfil } = await admin.from('quintal_perfis').select('papel').eq('user_id', chamador.id).maybeSingle()
  if (perfil?.papel !== 'admin') return json({ erro: 'Apenas administradores podem gerenciar usuários.' }, 403)

  let corpo: Record<string, unknown>
  try {
    corpo = await req.json()
  } catch {
    return json({ erro: 'Pedido inválido.' }, 400)
  }

  const acao = String(corpo.acao ?? '')
  const id = String(corpo.id ?? '')
  const papel = String(corpo.papel ?? '')
  const senha = String(corpo.senha ?? '')
  const email = String(corpo.email ?? '').trim().toLowerCase()

  try {
    if (acao === 'listar') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
      if (error) throw error
      const { data: perfis } = await admin.from('quintal_perfis').select('user_id, papel')
      const papeis = new Map((perfis ?? []).map((p: { user_id: string; papel: string }) => [p.user_id, p.papel]))
      const usuarios = data.users
        .map((u) => ({ id: u.id, email: u.email ?? '', papel: papeis.get(u.id) ?? 'leitor', criadoEm: u.created_at, ultimoAcesso: u.last_sign_in_at ?? null }))
        .sort((a, b) => a.email.localeCompare(b.email))
      return json({ ok: true, usuarios })
    }

    if (acao === 'criar') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ erro: 'E-mail inválido.' }, 400)
      if (senha.length < 8) return json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
      if (!PAPEIS.includes(papel)) return json({ erro: 'Perfil inválido.' }, 400)
      const { data, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true })
      if (error) return json({ erro: traduzir(error.message) }, 400)
      const { error: erroPerfil } = await admin.from('quintal_perfis').upsert({ user_id: data.user.id, email, papel }, { onConflict: 'user_id' })
      if (erroPerfil) throw erroPerfil
      return json({ ok: true, id: data.user.id })
    }

    if (acao === 'papel') {
      if (!id || !PAPEIS.includes(papel)) return json({ erro: 'Pedido inválido.' }, 400)
      if (id === chamador.id) return json({ erro: 'Você não pode alterar o seu próprio perfil.' }, 400)
      const { error } = await admin.from('quintal_perfis').update({ papel }).eq('user_id', id)
      if (error) throw error
      return json({ ok: true })
    }

    if (acao === 'senha') {
      if (!id) return json({ erro: 'Pedido inválido.' }, 400)
      if (senha.length < 8) return json({ erro: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha })
      if (error) return json({ erro: traduzir(error.message) }, 400)
      return json({ ok: true })
    }

    if (acao === 'remover') {
      if (!id) return json({ erro: 'Pedido inválido.' }, 400)
      if (id === chamador.id) return json({ erro: 'Você não pode remover o seu próprio acesso.' }, 400)
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) throw error
      return json({ ok: true })
    }

    return json({ erro: 'Ação desconhecida.' }, 400)
  } catch (e) {
    console.error('admin-usuarios', acao, e)
    return json({ erro: 'Não foi possível concluir a operação.' }, 500)
  }
})
