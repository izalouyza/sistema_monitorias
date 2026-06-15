# Arquitetura do Sistema

# UfersaMentor

## 1. Visão Geral

O **UfersaMentor** é uma aplicação desenvolvida para centralizar e facilitar o gerenciamento das monitorias acadêmicas na **UFERSA**. O sistema permite o cadastro de monitores, acompanhamento de sessões e visualização de horários, substituindo controles manuais por uma plataforma organizada.

O projeto foi concebido como um **MVP (Minimum Viable Product)** no contexto da disciplina de Engenharia de Software.

---

# 2. Tecnologias Utilizadas

## Frontend
*   **TypeScript**: Utilizado como linguagem principal para garantir tipagem e segurança em todo o desenvolvimento.
*   **CSS**: Responsável pela estilização e interface visual.

## Backend


## Banco de Dados


## Ferramentas de Desenvolvimento
*   **Git & GitHub**: Controle de versão e colaboração.
*   **Engenharia de Software**: Aplicação de levantamento de requisitos, modelagem e prototipação.

---

# 3. Estrutura do Projeto

A organização dos arquivos segue uma separação clara entre código-fonte e documentação técnica [5]:

```text
UfersaMentor/
├── src/
│   ├── frontend/        # Interface gráfica da aplicação
│   └── backend/         # Regras de negócio e comunicação com o banco
│
├── docs/                # Documentação técnica complementar
│   ├── arquitetura.md   # Detalhes da estrutura da aplicação
│   ├── backlog.md       # Planejamento de funcionalidades
│   └── diagramas.md     # Modelagem visual do sistema
│
├── .gitignore           # Arquivos ignorados pelo controle de versão
└── README.md            # Guia geral de execução e apresentação

```

---

# 4. Fluxo Básico da Aplicação

Com base na estrutura do UfersaMentor e nas camadas de processamento identificadas, o fluxo da aplicação segue este modelo:

```text
Usuário (Aluno | Monitor | Professor)
      │
      ▼
Frontend (Interface Gráfica do UfersaMentor)
      │
      ▼
API / Backend (Controladores)
      │
      ▼
Camada de Serviços (Lógica de Monitoria)
      │
      ▼
Repositório (Acesso aos Dados)
      │
      ▼
Banco de Dados (UfersaMentor Database)
      │
      ▼
Resposta ao Backend
      │
      ▼
Frontend (Atualização da Interface)
      │
      ▼
Usuário
```

O usuário (aluno | monitor | professor) interage com a interface para realizar ações como o cadastro de monitores ou a visualização de horários. O frontend captura essas ações e as envia para o backend, que é o responsável por processar as regras de negócio acadêmicas e gerenciar a comunicação com o banco de dados.

Após a consulta ou persistência das informações (como o registro de uma nova sessão de monitoria), o backend devolve uma resposta que o frontend utiliza para atualizar a tela, garantindo que o processo de gerenciamento seja centralizado e eficiente.

---

# 5. Responsabilidade dos Componentes

## Frontend

Responsável por toda a interface gráfica, garantindo que as funcionalidades de visualização de horários e autenticação sejam acessíveis ao usuário final.

---

## Backend

Gerencia as regras de negócio e a persistência de dados. É o núcleo que controla o gerenciamento de monitores e a integridade das informações do sistema.

---

# 6. Arquitetura Adotada

O projeto utiliza uma arquitetura em camadas (Frontend → Backend → Banco de Dados), promovendo baixo acoplamento. No contexto do UfersaMentor, essa separação garante que o frontend possa evoluir visualmente (melhorando o protótipo original) sem afetar as regras de negócio de gerenciamento de monitorias no backend.

O uso de TypeScript em ambas as camadas (97.5% do código) assegura uma padronização técnica e maior segurança no fluxo de dados
Essa separação permite que alterações na interface não impactem diretamente a lógica de negócio, tornando o sistema mais organizado e escalável.

---

# 7. Escalabilidade

A estrutura atual foi desenhada para suportar a evolução do MVP. O backlog do projeto já prevê a inclusão de novas funcionalidades por meio da criação de novos componentes e serviços, sem comprometer a base existente de gerenciamento de informações.

Essa abordagem favorece o desenvolvimento colaborativo e segue boas práticas de Engenharia de Software.

---

# 8. Considerações Finais

A arquitetura do UfersaMentor atende aos objetivos da disciplina de Engenharia de Software, estabelecendo uma base sólida para um sistema que centraliza informações acadêmicas. O foco na modularidade permite que a aplicação saia do estágio de MVP para uma solução completa de controle de monitorias para a UFERSA.
