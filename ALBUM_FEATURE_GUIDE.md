# 💿 Guia de Teste - Álbuns Clicáveis

## ✅ O que foi implementado

### 1. Álbuns Agora São Clicáveis ✨
- Quando você busca por um artista (ex: "Linkin Park")
- Os álbuns aparecem com capa, nome e total de músicas
- **Agora você pode clicar em um álbum**
- Abre uma página dedicada mostrando todas as músicas

### 2. Visualização Completa do Álbum
- Capa do álbum em alta qualidade (160x160px)
- Nome do álbum e nome do artista
- Total de músicas do álbum
- **Botão para tocar o álbum inteiro**
- Botão "Fechar álbum" para voltar aos resultados
- Lista completa de todas as faixas do álbum

### 3. Reprodutor de Álbum
- Quando você clica em uma música do álbum
- **Toca APENAS as músicas daquele álbum**
- Não mistura com outras músicas da biblioteca
- A fila segue a ordem do álbum
- Duração de cada música visível

## 🚀 Como Testar

### Setup Inicial
1. **Backend** deve estar rodando: `cd backend && npm run start:dev`
2. **Frontend** está rodando em: http://localhost:5174
3. Faça login na aplicação

### Teste Passo a Passo

#### 1️⃣ Buscar por um Artista
```
1. Na barra de busca, digite o nome de um artista
   Exemplo: "Linkin Park", "Eminem", "The Weeknd"
2. Aguarde os resultados carregarem
3. Procure pela seção "Álbuns"
```

#### 2️⃣ Clicar em um Álbum
```
1. Na seção de Álbuns, você verá cards com:
   - Capa do álbum
   - Nome do álbum
   - Artista
   - Número de músicas
   
2. CLIQUE no card do álbum
   
3. Esperado:
   ✅ Você será levado para a página do álbum
   ✅ Logo vê: capa, nome, artista, botão PLAY
   ✅ Logo abaixo, todas as músicas se carregam
   ✅ Pode scrollar para ver todas as faixas
```

#### 3️⃣ Reproduzir o Álbum Inteiro
```
1. Na página do álbum, clique no botão PLAY (grande círculo verde)
2. Esperado:
   ✅ A primeira música começa a tocar
   ✅ Na barra de rodapé, você vê a música tocando
   ✅ A próxima música é a próxima do álbum (em ordem)
```

#### 4️⃣ Reproduzir uma Música Específica
```
1. Na lista de músicas do álbum
2. Clique na música que quer tocar
3. Esperado:
   ✅ Essa música começa a tocar
   ✅ Quando terminar, toca a próxima do álbum
   ✅ As músicas tocam SÓ dent album (não mistura com outras)
   ✅ O número da música é destaque com ♪
```

#### 5️⃣ Voltar aos Resultados
```
1. Na página do álbum, clique "Fechar álbum"
2. Esperado:
   ✅ Volta para os resultados da busca
   ✅ Os resultados e posição da página se mantêm
   ✅ Você pode clicar em outro álbum ou voltar a buscar
```

## 📊 Verificação Técnica

### O que Mudou no Código

#### Frontend (`web/src/App.tsx`)
```
✅ Adicionado estado: selectedAlbum
✅ Adicionado estado: albumSongs (lista de músicas)
✅ Adicionado estado: loadingAlbum (carregamento)

✅ Efeito que busca músicas quando álbum é selecionado
✅ Álbuns agora chamam: setSelectedAlbum() ao invés de busca

✅ Nova view para detalhes do álbum (similar a playlists)
✅ Mostra todas as músicas, permite tocar
✅ Botão para fechar e voltar aos resultados
```

#### Fluxo de Dados
```
Busca por Artista
    ↓
Resultados aparecem (incluindo Álbuns)
    ↓
Usuário clica em um Álbum
    ↓
selectedAlbum é definido
    ↓
Efeito dispara e busca todas as músicas
    ↓
albumSongs é preenchido
    ↓
UI renderiza detalhes do álbum + lista de músicas
    ↓
Usuário clica em uma música
    ↓
playSong() é chamado COM apenas albumSongs como fila
```

## 🎯 Casos de Uso

### Casos Funcionais ✅
- [x] Buscar por artista e ver álbuns
- [x] Clicar em um álbum abre detalhes
- [x] Ver todas as músicas do álbum
- [x] Tocar o álbum inteiro (começando do 1º)
- [x] Tocar uma música específica
- [x] Próxima música é a próxima do álbum
- [x] Fechar álbum volta aos resultados

### Casos Adicionais ✨
- [ ] Salvação em favoritos (botão ⭐ em cada música)
- [ ] Download de álbum inteiro
- [ ] Compartilhar álbum
- [ ] Ver mais informações (ano, gênero, etc)

## 🐛 Troubleshooting

### "Álbum não carrega"
```
1. Verificar se a busca retorna músicas
2. Verificar se há internet
3. Verificar console (F12) para erros
```

### "Clico mas não abre"
```
1. Verificar se onClick está funcionando (DevTools)
2. Verificar se o álbum tem musicasAssociadas
3. Tentar buscarpor outro artista diferente
```

### "Musica mistura com outras"
```
1. Verificar se albumSongs é passado corretamente ao playSong()
2. Verificar se queue é resetada ao trocar de álbum
```

## 📈 Próximas Melhorias (Opcional)

1. **Barra Lateral Rápida**: Adicionar álbuns recentes na sidebar
2. **Informações**: Mostrar ano de lançamento, gênero
3. **Downloads**: Baixar álbum completo (se premium)
4. **Histórico**: Atualizar histórico quando toca um álbum
5. **Recomendações**: Sugerir álbuns similares

## 🎉 Resultado Final

Os usuários agora podem:
1. ✅ Buscar por artista
2. ✅ Ver álbuns do artista de forma visual
3. ✅ **Clicar para abrir álbum completo** ← NOVO!
4. ✅ Ver todas as faixas em ordem
5. ✅ Tocar apenas aquele álbum
6. ✅ Voltar e explorar outros álbuns

Tipo Spotify! 🎵
