# 🎓 EduRAG - Assistant pédagogique (RAG + LLM)

Application web d'aide à l'apprentissage : **chatbot avec citations des sources**, **résumés** et **QCM**, construits sur un pipeline **RAG** et un **LLM local** (Ollama).


> Auteur : **Yassine Amri**

## 1. Fonctionnalités

**Utilisateur** : chat RAG avec citations `[Source n]` et pages, réponse « je ne sais pas » hors périmètre, avis 👍/👎, streaming mot à mot avec rendu Markdown et bouton Stop, résumés (court / moyen / détaillé), quiz QCM (3 niveaux), upload de PDF, inscription/connexion (email ou Google), profil, thème sombre/clair.

**Administrateur** (`/admin`) : tableau de bord (KPIs, graphiques), CRUD utilisateurs (rôles, activation, suppression), gestion des documents, historique des conversations, **évaluation automatique du RAG**, **paramètres** (modèle LLM, seuil, top_k), journal d'audit, **exports CSV**.

## 2. Architecture

    Utilisateur -> Next.js (interface) -> FastAPI (API + JWT) -> Retriever FAISS -> Embeddings e5
                                                            -> Ollama (LLM)
                                                            -> SQLite (utilisateurs, historique, audit, paramètres)

| Processus | Rôle | Port |
|---|---|---|
| Ollama | exécute le LLM localement | 11434 |
| FastAPI (uvicorn) | API, RAG, auth, admin | 8000 |
| Next.js | interface web | 3000 |

## 3. Stack technique

| Couche | Choix |
|---|---|
| Extraction PDF | PyMuPDF |
| Chunking | LangChain RecursiveCharacterTextSplitter (800 car., chevauchement 150) |
| Embeddings | intfloat/multilingual-e5-small (384 dim.) |
| Base vectorielle | FAISS IndexFlatIP (vecteurs normalisés = similarité cosinus) |
| LLM | Llama 3.1 8B / Qwen 2.5 7B via Ollama (modifiable dans l'admin) |
| API | FastAPI + Uvicorn |
| Base de données | SQLite |
| Auth | Auth.js (Google + email) + PyJWT |
| Front | Next.js, Tailwind CSS, react-markdown |

## 4. Structure du dépôt

    api.py              # routes FastAPI
    src/                # ingestion, embeddings, retriever, llm, rag, summarizer, quiz,
                        # users, security, ratelimit, chatlog, evaluation, settings
    frontend/           # application Next.js (app/, components/, lib/)
    data/               # (ignoré par git) PDF, index FAISS, users.db

## 5. Installation

Prérequis : Python 3.10+, Node.js 18+, Ollama, ~10 Go d'espace disque.

    git clone https://github.com/yassine10tn/assistant-pedagogique-rag.git
    cd assistant-pedagogique-rag
    python -m venv venv
    venv\Scripts\activate
    pip install -r requirements.txt
    ollama pull llama3.1:8b
    ollama pull qwen2.5:7b      # optionnel

Fichier `.env` (racine) :

    JWT_SECRET=chaine_aleatoire
    INTERNAL_API_SECRET=autre_chaine_aleatoire
    ADMIN_EMAILS=votre.email@gmail.com

Fichier `frontend/.env.local` :

    AUTH_SECRET=chaine_aleatoire
    AUTH_GOOGLE_ID=...
    AUTH_GOOGLE_SECRET=...
    INTERNAL_API_SECRET=meme_valeur_que_le_backend

    cd frontend
    npm install

Google OAuth (optionnel) : Google Cloud > Google Auth Platform > client Web, URI de redirection `http://localhost:3000/api/auth/callback/google`, ajouter votre email aux utilisateurs tests.

Placer des PDF dans `data/raw/` puis `python -m src.retriever` pour construire l'index.

## 6. Lancement (3 terminaux)

    # Ollama : démarre avec l'application (icône barre des tâches)
    uvicorn api:app --reload            # racine, venv activé
    cd frontend && npm run dev

Application : http://localhost:3000 - API : http://localhost:8000/docs

## 7. Pipeline RAG

1. Extraction par page (PyMuPDF) et nettoyage (tirets, sommaire, symboles LaTeX).
2. Chunking 800/150, embeddings e5 (préfixes `passage:` / `query:`).
3. Index FAISS ; recherche des `top_k` passages ; filtre par seuil `MIN_SCORE`.
4. Si aucun passage : réponse « Je ne trouve pas la réponse » sans appeler le LLM.
5. Prompt strict (réponse uniquement depuis les extraits, citations `[Source n]`), génération en streaming.
6. Résumés en map-reduce ; quiz en JSON avec parseur tolérant et nouvelles tentatives.

## 8. Évaluation (20 questions : 10 dans le cours, 10 hors cours)

**Retrieval seul (sans LLM)**

| Seuil | Dans le cours conservées | Hors cours bloquées | Précision |
|---|---|---|---|
| 0,78 | 100 % | 20 % | 60 % |
| 0,82 | 100 % | 90 % | **95 %** |

**Évaluation complète (retrieval + LLM + prompt strict), seuil 0,78**

| Modèle | Précision | Dans le cours | Refus hors cours | Citations | Temps moyen |
|---|---|---|---|---|---|
| llama3.1:8b | **100 %** | X % | X % | X % | X s |
| qwen2.5:7b | **95 %** | X % | X % | X % | X s |

**Analyse** : le score de similarité seul ne sépare pas questions du cours et hors cours (écart nul : 0,833 contre 0,833). Le prompt strict du LLM compense. Échantillon de 20 questions : tendance, pas preuve générale.

## 9. Sécurité

PBKDF2-HMAC-SHA256 (200 000 itérations, sel par utilisateur) ; JWT 24 h vérifié à chaque requête ; rôles user/admin ; admin principal défini par `ADMIN_EMAILS` (via Google uniquement) et protégé ; endpoint Google protégé par secret interne ; limitation de débit (login, inscription, chat) ; uploads contrôlés ; exports CSV protégés contre l'injection de formules ; journal d'audit ; CORS limité à `localhost:3000`.

## 10. Limites et pistes

Limites : LLM de 7-8 Mds de paramètres pouvant ignorer le prompt ; score seul insuffisant ; SQLite et limiteur en mémoire adaptés à un projet académique ; pas d'OCR ; déploiement public nécessitant un hébergement du LLM.
Pistes : re-ranking (cross-encoder), recherche hybride BM25, PostgreSQL + pgvector, Docker Compose, réinitialisation de mot de passe par email.

## 11. Dépannage

| Problème | Solution |
|---|---|
| API hors ligne | `uvicorn api:app --reload` depuis la racine |
| « Ollama n'est pas démarré » | lancer l'application Ollama |
| `error=Configuration` (Auth.js) | vérifier `frontend/.env.local`, relancer `npm run dev` |
| `redirect_uri_mismatch` | URI exacte `http://localhost:3000/api/auth/callback/google` |
| Réponses lentes | `ollama ps` doit afficher 100 % GPU |

© 2026 **Yassine Amri**. All rights reserved.
