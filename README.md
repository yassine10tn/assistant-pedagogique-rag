# 🎓 EduRAG - Assistant pédagogique (RAG + LLM)

Application web d'aide à l'apprentissage : **chatbot avec citations des sources**, **résumés** et **QCM**, construits sur un pipeline **RAG** et un **LLM local** (Ollama).


> Auteur : **Yassine Amri**

## 1. Fonctionnalités

**Utilisateur**
- **Chat RAG** : réponses issues uniquement des documents, avec citations `[Source n]` (fichier et page), streaming mot à mot, rendu Markdown, bouton Stop, copie, avis 👍/👎. Réponse « Je ne trouve pas la réponse » hors périmètre.
- **Résumés** : court, moyen, détaillé (map-reduce) ; **choix du modèle** (Llama ou Qwen), temps de génération affiché, copie et export `.md`.
- **Quiz QCM** : sujet libre, **nombre de questions libre (1 à 20)**, 3 niveaux de difficulté, **choix du modèle**, parcours question par question avec correction immédiate, explications, score animé et récapitulatif ; raccourcis clavier (1-4 / A-D, Entrée).
- **Documents** : téléversement de PDF (glisser-déposer) et indexation automatique.
- **Compte** : inscription/connexion par email ou Google, profil, changement de mot de passe, suppression du compte, thème sombre/clair.
- **Interface** : page d'accueil, chat et pages Résumés/Quiz repensés (icônes SVG, animations, responsive).

**Administrateur (`/admin`)**
- Tableau de bord (KPIs, graphiques, satisfaction 👍/👎, temps de réponse).
- CRUD utilisateurs (créer, modifier, changer le rôle, activer/désactiver, supprimer).
- Gestion des documents et réindexation, historique des conversations.
- **Évaluation automatique du RAG** : questions dans/hors du cours, métriques, tableau de choix du seuil ; **le modèle utilisé est enregistré pour chaque évaluation**.
- **Paramètres** : modèle LLM, seuil `MIN_SCORE`, `top_k`, modifiables sans toucher au code.
- Journal d'audit et **exports CSV** (utilisateurs, historique, audit, évaluations).

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
| 0,84 | 90 % | 100 % | 95 % |

**Pipeline complet (retrieval + LLM + prompt strict), seuil 0,78**

| Modèle | Précision (plusieurs essais) | Exemple d'essai : dans le cours | Refus hors cours | Citations | Temps moyen |
|---|---|---|---|---|---|
| llama3.1:8b | 90 % / 95 % / 100 % | 100 % | 90 % | 100 % | 2,7 s |
| qwen2.5:7b | 95 % / 95 % / 95 % | 90 % | 100 % | 100 % | 1,7 s |

**Analyse**
- Le score de similarité seul ne sépare pas les questions du cours de celles hors cours : l'écart (min dans le cours - max hors cours) est nul (0,833 contre 0,833). Au seuil 0,78, le retrieval seul ne bloque que 20 % des questions hors sujet.
- Le prompt strict du LLM compense : la précision passe de 60 % à 90-100 %.
- Les deux modèles se valent à ±5 points près. Les résultats varient d'un essai à l'autre (génération non déterministe, température 0,2) : Llama a obtenu 90 %, 100 % puis 95 %. Qwen s'est montré plus stable et plus rapide ; Llama refuse parfois à tort une question du cours, Qwen laisse parfois passer une question hors sujet.
- Un seuil de 0,82 donne 95 % en retrieval seul mais reste fragile (0,817 hors cours contre 0,833 dans le cours).
- Limite : échantillon de 20 questions ; ces chiffres indiquent une tendance, pas une preuve générale. Le temps de la toute première requête inclut le chargement du modèle en mémoire.

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
