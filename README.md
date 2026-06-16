# SGM - Sistema de Gerenciamento de Monitorias (UfersaMentor)

## 1. Objetivo do Sistema

O **UfersaMentor** é uma plataforma desenvolvida para centralizar, organizar e automatizar o gerenciamento das monitorias acadêmicas do Centro Multidisciplinar de Pau dos Ferros da UFERSA.

O sistema busca integrar informações sobre horários, disciplinas, locais e monitores, facilitando o agendamento de atendimentos pelos alunos e proporcionando aos professores e coordenadores uma ferramenta para controle de frequência, acompanhamento das atividades e emissão de relatórios.

---

## 2. Descrição do Problema

Atualmente, o gerenciamento das monitorias na UFERSA ocorre de forma descentralizada, utilizando meios como avisos verbais, e-mails e publicações no SIGAA.

Essa situação gera dificuldades como:

* falta de padronização das informações;
* dificuldade para os alunos localizarem horários e monitores;
* ausência de controle eficiente dos atendimentos realizados;
* complexidade na elaboração de relatórios e folhas de frequência;
* baixa rastreabilidade das atividades desenvolvidas.

O **UfersaMentor** surge como uma solução para tornar esse processo mais organizado, acessível e eficiente.

---

## 3. Principais Funcionalidades

* **Gestão de Acessos**

  * Cadastro e gerenciamento de monitores.
  * Autenticação unificada dos usuários.

* **Busca de Monitorias**

  * Pesquisa por disciplina.
  * Pesquisa por monitor.
  * Pesquisa por horário disponível.

* **Agendamento**

  * Reserva de vagas em plantões.
  * Controle de conflitos e concorrência entre agendamentos.

* **Controle de Frequência**

  * Registro digital de presença e ausência dos alunos.

* **Dashboards**

  * Visualização de indicadores e métricas de desempenho.

* **Comunicação**

  * Chat interno entre alunos e monitores.

* **Repositório de Materiais**

  * Upload de materiais de apoio.
  * Download de arquivos disponibilizados.

* **Notificações**

  * Lembretes de atendimentos.
  * Avisos operacionais e comunicados importantes.

---

## 4. Tecnologias Utilizadas

### Frontend

* React
* TypeScript

### Backend (Backend as a Service)

* Supabase

### Banco de Dados

* PostgreSQL (hospedado no Supabase)

### Ferramentas

* Git
* GitHub
* Vite
* Tailwind CSS

---

### 5. Estrutura do Projeto

```text
UfersaMentor/
├── docs/
│   ├── arquitetura.md
│   ├── backlog.md
│   └── diagramas.md
│
├── src/
│   ├── components/       # Componentes reutilizáveis da interface
│   ├── pages/            # Páginas da aplicação
│   ├── services/         # Configuração do Supabase e serviços
│   ├── assets/           # Recursos estáticos
│   ├── styles/           # Arquivos de estilo
│   └── supabase/         # Configurações e migrações do Supabase
│
├── .gitignore
├── ATTRIBUTIONS.md
├── README.md
├── default_shadcn_theme.css
├── index.html
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.mjs
└── vite.config.ts
```

---

## 6. Instruções de Execução

Para executar o **UfersaMentor** em sua máquina local, siga os passos descritos abaixo.

### 6.1 Clone o repositório

```bash
git clone https://github.com/izalouyza/UfersaMentor.git
```

---

### 6.2 Acesse a pasta do projeto

```bash
cd UfersaMentor
```

---

### 6.3 Instale as dependências

Certifique-se de que o **Node.js** esteja instalado em sua máquina. Em seguida, execute o comando abaixo para instalar todas as dependências do projeto:

```bash
npm install
```

---

### 6.4 Configure as variáveis de ambiente

Crie um arquivo chamado **`.env`** na raiz do projeto (no mesmo nível do arquivo `package.json`) e adicione as credenciais do seu projeto Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

> **Observação:** Essas informações podem ser encontradas no painel do Supabase, em **Project Settings → API**.

---

### 6.5 Execute a aplicação

Para iniciar o servidor de desenvolvimento, execute:

```bash
npm run dev
```

Após a inicialização, o terminal exibirá um endereço semelhante a:

```text
http://localhost:5173
```

Abra esse endereço em seu navegador para acessar e utilizar o **UfersaMentor**.


## 7. Link do Protótipo
Acesse abaixo o protótipo navegável:

[Protótipo - UfersaMentor](https://knee-ivory-90805343.figma.site)

---

## 8. Integrantes da Equipe

* Ingridy Duarte Costa
* Izadora Louyza Silva Figueiredo
* Lívian Maria Lucena Gomes Pinheiro

---

## 9. Status Atual do Desenvolvimento

O projeto encontra-se na fase de **MVP (Minimum Viable Product)**.

Atualmente, estão implementadas ou em fase final de integração as funcionalidades relacionadas à:

* pesquisa de horários;
* agendamento de monitorias;
* gestão de plantões;
* cadastro e gerenciamento de monitores;
* autenticação utilizando o Supabase;
* chat interno;
* dashboards analíticos;
* notificações inteligentes.

---

## 10. Licença

Este projeto foi desenvolvido para fins acadêmicos na disciplina de **Engenharia de Software** da **Universidade Federal Rural do Semiárido (UFERSA)**.
