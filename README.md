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

## 5. Estrutura do Projeto

```text

```

---

## 6. Instruções de Execução

### 6.1 Clone o repositório

```bash
git clone https://github.com/izalouyza/UfersaMentor
```

### 6.2 Acesse a pasta do projeto

```bash

```

### 6.3 Instale as dependências

```bash

```

### 6.4 Configure as variáveis de ambiente

Crie um arquivo **`.env`** na raiz do projeto contendo:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 6.5 Execute a aplicação

```bash

```

Após a inicialização, acesse a URL exibida pelo Vite no navegador.

---

## 7. Link do Protótipo

> **Protótipo navegável:**
> 

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
