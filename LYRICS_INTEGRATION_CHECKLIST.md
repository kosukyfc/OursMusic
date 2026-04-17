# ✅ Checklist de Integração - Sistema de Lyrics Karaokê

> Guia passo-a-passo para integrar o sistema de lyrics em sua plataforma

---

## 📋 FASE 1: Preparação (5 minutos)

- [ ] Leia a [Especificação Técnica](./LYRICS_KARAOKE_SYSTEM.md)
- [ ] Entenda a [Arquitetura](./LYRICS_IMPLEMENTATION_GUIDE.md#-arquitetura)
- [ ] Revise os [tipos TypeScript](./web/src/types/lyrics.ts)
- [ ] Clone/Fork o repositório
- [ ] Configure `git` com branch `feature/lyrics-integration`

---

## 💻 FASE 2: Setup Frontend (React Web)

### 2.1 Copiar Arquivos
- [ ] Copie `/web/src/types/lyrics.ts` para seu projeto
- [ ] Copie `/web/src/hooks/useLyricsSync.ts` para seu projeto
- [ ] Copie `/web/src/hooks/useResponsiveLyrics.ts` para seu projeto
- [ ] Copie `/web/src/components/LyricsDisplay/` para seu projeto
- [ ] Copie `/web/src/utils/lyricsParser.ts` para seu projeto
- [ ] Copie `/web/src/styles/lyrics-animations.css` para seu projeto
- [ ] Copie `/web/src/data/example-lyrics.ts` para seu projeto (opcional, para testes)

### 2.2 Instalar Dependências
```bash
# React e dependências já devem estar instaladas
# Verifique que você tem:
npm list react react-dom

# Se não tiver, instale:
npm install react@^19.0.0 react-dom@^19.0.0
```

- [ ] Confirme React 19+ instalado
- [ ] Confirme TypeScript configurado

### 2.3 Importar Tipos Globalmente
Adicione em `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["./src/types/lyrics.ts"]
  }
}
```

- [ ] Adicione tipos ao tsconfig

### 2.4 Importar Estilos Globais
Em `src/main.tsx` ou `src/App.tsx`:
```typescript
import '@/styles/lyrics-animations.css';
```

- [ ] Importe CSS global

### 2.5 Teste Rápido
```bash
npm run dev
# Abra http://localhost:5173
```

- [ ] Confirme que o projeto compila sem erros

---

## 🎵 FASE 3: Integração com Player de Música

### 3.1 Localize o Componente de Música Existente
- [ ] Encontre seu componente `MusicPlayer` ou equivalente
- [ ] Identifique o elemento `<audio>` que controla reprodução
- [ ] Anote a estrutura do estado (título, artista, URL, etc)

### 3.2 Adicione Componente LyricsDisplay
Em seu componente de música:

```typescript
import { LyricsDisplay } from '@/components/LyricsDisplay';
import { useRef } from 'react';

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [lyrics, setLyrics] = useState(null);

  // Seu código existente...

  return (
    <div>
      {/* Seu player existente */}
      <audio ref={audioRef} src={songUrl} />
      
      {/* NOVO: Adicione LyricsDisplay */}
      <LyricsDisplay
        lyrics={lyrics}
        audioElement={audioRef.current}
        theme="dark"
      />
    </div>
  );
}
```

- [ ] Adicione elemento ref ao seu `<audio>`
- [ ] Importe `LyricsDisplay`
- [ ] Renderize o componente com referência ao áudio

### 3.3 Carregue Letras da API
```typescript
useEffect(() => {
  async function loadLyrics() {
    try {
      const response = await fetch(
        `/api/v1/lyrics-premium/${trackId}?title=${title}&artist=${artist}`
      );
      const data = await response.json();
      if (data.success) {
        setLyrics(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar letras:', error);
    }
  }

  if (trackId) loadLyrics();
}, [trackId, title, artist]);
```

- [ ] Implemente carregamento de letras
- [ ] Trate erros adequadamente
- [ ] Teste com uma música real

### 3.4 Teste No Navegador
```bash
npm run dev
# 1. Abra seu player
# 2. Selecione uma música
# 3. Confirme que letras aparecem
# 4. Play a música
# 5. Verifique sincronização
```

- [ ] Letras aparecem na tela
- [ ] Verso atual em destaque (verde neon)
- [ ] Próximo verso preparando
- [ ] Animações suaves

---

## 🔌 FASE 4: Setup Backend (NestJS)

### 4.1 Adicione Módulo Lyrics
```typescript
// app.module.ts
import { LyricsModule } from './lyrics/lyrics.module';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({ ttl: 60 * 60 * 24 * 7 }), // 7 dias
    LyricsModule,
    // ... outros módulos
  ],
})
export class AppModule {}
```

- [ ] Adicione `CacheModule`
- [ ] Importe `LyricsModule`

### 4.2 Setup Prisma
```bash
# Crie model de lyrics
npx prisma migration create --name add_lyrics_table

# Ou edite schema.prisma diretamente
```

**schema.prisma**:
```prisma
model Lyrics {
  id            String   @id @default(cuid())
  trackId       String   @unique
  title         String
  artist        String
  content       String   // JSON
  source        String
  language      String
  hasWordSync   Boolean
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

- [ ] Adicione model ao schema
- [ ] Execute migration

### 4.3 Configure Variáveis de Ambiente (.env)
```env
# Lyrics
GENIUS_ACCESS_TOKEN=your_token_here
MUSIXMATCH_API_KEY=your_key_here

# Cache
CACHE_TTL=604800000  # 7 dias em ms

# Database
DATABASE_URL=postgresql://user:pass@localhost/db
```

- [ ] Obtenha API keys (Genius, Musixmatch)
- [ ] Configure DATABASE_URL
- [ ] Salve em `.env`

### 4.4 Copie Serviços
- [ ] Copie `backend/src/lyrics/lyrics-premium.service.ts`
- [ ] Copie `backend/src/lyrics/lyrics-premium.controller.ts`
- [ ] Atualize imports se necessário

### 4.5 Teste API
```bash
# Start backend
npm run start:dev

# Teste endpoint
curl "http://localhost:3000/api/v1/lyrics-premium/test-123?title=Song&artist=Artist"

# Deve retornar:
# { "success": true, "data": {...}, "cached": false }
```

- [ ] Backend compila sem erros
- [ ] API responde em `/api/v1/lyrics-premium/:trackId`
- [ ] Retorna JSON válido

---

## 🎨 FASE 5: Customização (Opcional)

### 5.1 Ajuste Cores
Em `styles/lyrics-animations.css`:
```css
:root {
  --lyrics-accent-highlight: #10b981;  /* Verde padrão */
  --lyrics-accent-glow: rgba(16, 185, 129, 0.8);
  /* Customize conforme sua brand */
}
```

- [ ] Ajuste cores para match com sua brand
- [ ] Teste em dark e light mode

### 5.2 Ajuste Animações
```typescript
<LyricsDisplay
  animationConfig={{
    transitionDuration: 1000,  // mais lento
    glowIntensity: 1.5,        // glow mais intenso
    enableBlur: true,
    enableScaleUp: true,
  }}
/>
```

- [ ] Fine-tune duração de transição
- [ ] Ajuste intensidade de efeitos

### 5.3 Responsive Breakpoints
Se necessário, customize em `useResponsiveLyrics.ts`:
```typescript
const BREAKPOINTS = {
  mobile: 0,
  tablet: 600,
  desktop: 1024,
  tv: 2560,
};
```

- [ ] Ajuste breakpoints se necessário

---

## ✅ FASE 6: Testes Completos

### 6.1 Testes Funcionais
- [ ] **Sincronização**: Verso atual sempre em destaque
- [ ] **Animações**: Smooth, sem lag (60 FPS)
- [ ] **Responsividade**: Teste em mobile, tablet, desktop
- [ ] **Múltiplos idiomas**: PT, EN, ES funcionam
- [ ] **Calibração**: Botão de calibração funciona
- [ ] **Player controls**: Play, pause, skip funcionam
- [ ] **Erro handling**: API indisponível é tratada gracefully

### 6.2 Testes de Performance
```bash
# Chrome DevTools > Performance
# 1. Abra página de lyrics
# 2. Dê play em música
# 3. Grave performance
# 4. Verifique FPS (target: 60)
# 5. Verifique memory (target: <15MB)
```

- [ ] Média de 60 FPS
- [ ] <15MB memória
- [ ] <2s time to interactive

### 6.3 Testes de Compatibilidade
| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome  | ✓       | ✓      | - [ ] |
| Firefox | ✓       | ✓      | - [ ] |
| Safari  | ✓       | ✓      | - [ ] |
| Edge    | ✓       | ✓      | - [ ] |

- [ ] Teste em pelo menos 2 navegadores
- [ ] Teste em dispositivo móvel real

### 6.4 Testes de Acessibilidade
- [ ] Keyboard navigation funciona
- [ ] Screen readers leem conteúdo
- [ ] Contraste suficiente (WCAG AA)
- [ ] Sem flashing excessivo (<3Hz)

- [ ] Testes de acessibilidade básicos

---

## 🚀 FASE 7: Deploy

### 7.1 Build Production Frontend
```bash
npm run build
# Verifica que build completa sem erros
```

- [ ] Build compila sem erros
- [ ] Bundle size < 100KB (gzipped <50KB)

### 7.2 Build Production Backend
```bash
npm run build
# Verifica que build compila sem erros
```

- [ ] Backend compila sem erros
- [ ] Migrations preparadas

### 7.3 Deploy em Staging
- [ ] Deploy frontend em staging
- [ ] Deploy backend em staging
- [ ] Teste ponta-a-ponta em staging

### 7.4 Monitore Performance
- [ ] Setup Sentry para error tracking
- [ ] Setup Web Vitals monitoring
- [ ] Setup API performance monitoring

- [ ] Monitoring configurado

### 7.5 Deploy em Produção
- [ ] Backup database feito
- [ ] Migrations testadas em staging
- [ ] Plano de rollback preparado
- [ ] Deploy frontend
- [ ] Deploy backend
- [ ] Monitore por 1 hora para erros

- [ ] Tudo em produção

---

## 📊 FASE 8: Validação Final

### Checklist Final
- [ ] ✅ Letras sincronizadas corretamente
- [ ] ✅ Animações 60 FPS suaves
- [ ] ✅ Funciona em todas as plataformas
- [ ] ✅ API respondendo corretamente
- [ ] ✅ Cache funcionando (7 dias)
- [ ] ✅ Sem console errors
- [ ] ✅ Performance otimizada
- [ ] ✅ Documentação completa

### Métricas de Sucesso
| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| FPS | 60 | - | - [ ] |
| Latência Sync | <50ms | - | - [ ] |
| Precisão Sync | >95% | - | - [ ] |
| Bundle Size | <50KB | - | - [ ] |
| Time to Interactive | <2s | - | - [ ] |
| Mobile Lighthouse | >80 | - | - [ ] |

- [ ] Todas as métricas atingidas

---

## 🎉 Conclusão

Quando todos os itens estiverem marcados, o sistema de lyrics karaokê estará:
- ✅ Implementado
- ✅ Testado
- ✅ Otimizado
- ✅ Documentado
- ✅ Em Produção

**Data de Conclusão Prevista**: ___/___/_____

**Responsável**: _______________________

**Assinatura**: _______________________

---

## 📞 Suporte & Recursos

- **Documentação Principal**: [LYRICS_IMPLEMENTATION_GUIDE.md](./LYRICS_IMPLEMENTATION_GUIDE.md)
- **Especificação Técnica**: [LYRICS_KARAOKE_SYSTEM.md](./LYRICS_KARAOKE_SYSTEM.md)
- **Resumo Visual**: [LYRICS_VISUAL_SUMMARY.md](./LYRICS_VISUAL_SUMMARY.md)
- **Demos**: [demos/lyrics.demo.tsx](./web/src/demos/lyrics.demo.tsx)
- **API Docs**: `/api/docs` (Swagger UI)

---

**Boa integração! 🚀**
