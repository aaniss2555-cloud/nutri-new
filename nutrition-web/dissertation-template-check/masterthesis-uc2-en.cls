%----------------------------------------------------
% Document Class
%----------------------------------------------------
\def\RCSfile{masterthesis-uc2-en}%
\def\RCSauthor{Dr. Ahmed-Chawki CHAOUCHE}%
\def\RCSversion{V1.11}%
\def\RCSdate{2022/03/09}%

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{masterthesis-uc2-en}[\RCSdate, \RCSversion: \RCSauthor]
\LoadClass[a4paper,oneside,12pt,natbib,oldfontcommands]{memoir}

%----------------------------------------------------
% Constants
%----------------------------------------------------
\def\countryEn{People's Democratic Republic of Algeria} 
\def\countryFr{République algérienne démocratique et populaire} 
\def\ministryEn{Ministry of Higher Education and Scientific Research} 
\def\ministryFr{Ministère de l'enseignement supérieur et de la recherche scientifique} 

\def\universityShortEn{University of Constantine 2} 
\def\universityShortFr{Universit\'e de Constantine 2} 
\def\universityLongEn{University of Abdelhamid Mehri -- Constantine 2} 
\def\universityLongFr{Universit\'e Abdelhamid Mehri -- Constantine 2} 

\def\facultyShortEn{NTIC Faculty} 
\def\facultyShortFr{Facult\'e NTIC} 
\def\facultyLongEn{Faculty of New Technologies of Information and Communication (NTIC)} 
\def\facultyLongFr{Facult\'e des nouvelles technologies de l'information et de la communication (NTIC)}

%\def\departmentShortEn{IFA Department}
%\def\departmentShortFr{Département IFA}
%\def\departmentLongEn{Department of Fundamental Computing and its Applications (IFA)}
%\def\departmentLongFr{Département d'informatique fondamentale et ses applications (IFA)}

\def\memoirEn{BACHELOR's Dissertation}
\def\memoirFr{Mémoire de Master}
\def\obtainEn{to obtain the diploma of Bachelor degree in Computer Science}
\def\obtainFr{pour obtenir le diplôme de Master en Informatique}

\def\studentsEn{Realized by:}
\def\studentsFr{Réalisé par~:}

\def\supervisorsEn{Under supervision of:}
\def\supervisorsFr{Sous la direction de~:}

%-----------------------------------------------------
% Variables
%-----------------------------------------------------
\def\department#1{\gdef\department{#1}}
\def\specialty#1{\gdef\specialty{#1}}
\def\level#1{\gdef\level{#1}}
\def\title#1{\gdef\title{#1}}
\def\studentFullnameA#1{\gdef\studentFullnameA{#1}}
\def\studentFullnameB#1{\gdef\studentFullnameB{#1}}
\def\studentFullnameC#1{\gdef\studentFullnameC{#1}}
\def\supervisorFullnameA#1{\gdef\supervisorFullnameA{#1}}
\def\supervisorFullnameB#1{\gdef\supervisorFullnameB{#1}}
\def\session#1{\gdef\session{#1}}

%----------------------------------------------------
% Dependencies
%----------------------------------------------------
% Language
\RequirePackage[utf8]{inputenc}
\RequirePackage[LAE,T1]{fontenc}
\RequirePackage[french,english]{babel}

\AtBeginDocument{
	\selectlanguage{english}
}

\RequirePackage{graphicx} 
\RequirePackage{amssymb,amsmath,amsfonts}
\RequirePackage{color}
\RequirePackage[table]{xcolor}
\RequirePackage{xifthen} % provides \isempty test
\RequirePackage{acronym}

% Margins
\RequirePackage{geometry}
\geometry{left=2.5cm,right=2cm,top=2.7cm,bottom=2.3cm}
%\RequirePackage{showframe}

% line spacing
\renewcommand{\baselinestretch}{1.3}

%-----------------------------------------------------
% Font
%-----------------------------------------------------
\RequirePackage{newpxtext} 
%\RequirePackage{gentium}
%\RequirePackage{kpfonts}
%\RequirePackage{tgpagella}

%-----------------------------------------------------
% links of Refs and URL
%-----------------------------------------------------
\RequirePackage{hyperref} 
\hypersetup{
	colorlinks=true,
	linkcolor=black,
	filecolor=black,      
	urlcolor=black,
	citecolor=black,
}
\RequirePackage{url} 

%-----------------------------------------------------
% Sections
%-----------------------------------------------------
\setsecnumdepth{subsubsection}

%-----------------------------------------------------
% Itemize and enumerate 
%-----------------------------------------------------
\RequirePackage{enumitem}
\setlist[itemize,1]{
	itemsep=2pt,parsep=0pt, topsep=3pt,
	label={\color{primary}\small\raisebox{2pt}{$\blacktriangleright$}}
}
\setlist[itemize,2]{
	itemsep=2pt,parsep=0pt, topsep=3pt,
	label={\color{primary}\tiny\raisebox{.9pt}{$\blacksquare$}}
}
\setlist[itemize,3]{
	itemsep=2pt,parsep=0pt, topsep=3pt,
	label={\color{primary}\raisebox{0.5pt}{$\bullet$}}
}

\setlist[enumerate,1]{
	itemsep=2pt,parsep=0pt, topsep=3pt, 
	label= \color{primaryDark}\theenumi.
}
\setlist[enumerate,2]{
	itemsep=2pt,parsep=0pt, topsep=3pt, 
	label= \color{primaryDark}\alph*)
}
\setlist[enumerate,3]{
	itemsep=2pt,parsep=0pt, topsep=3pt, 
	label= \color{primaryDark}\roman*.
}

%-----------------------------------------------------
% Colors
%-----------------------------------------------------
\definecolor{green-uc2ppt}{RGB}{51,120,23}
\definecolor{green-uc2}{RGB}{43,102,20} %36,84,16
\definecolor{greenlight-uc2}{RGB}{215,228,189}

\definecolor{primary}{HTML}{0556A3}
\definecolor{primaryLight}{HTML}{A3C1DE}
\definecolor{primaryDark}{HTML}{033666}

%------------------------------------------------------
% Tables
%------------------------------------------------------
\RequirePackage{multirow} % tables with multi-rows
\RequirePackage{array}
\RequirePackage{etoolbox}

% Background colors
\let\oldtabular\tabular
\let\endoldtabular\endtabular
\renewenvironment{tabular}{
	\rowcolors{1}{\ifnumequal{\rownum}{1}{primary}{white}}{primary!10}
	\oldtabular
}
{
	\endoldtabular
}

% Left, Center, Right
\newcolumntype{L}[1]{>{\raggedright\let\newline\\\arraybackslash\hspace{0pt}\ifnumequal{\rownum}{1}{\bfseries\color{white}}}m{#1}}
\newcolumntype{C}[1]{>{\centering\let\newline\\\arraybackslash\hspace{0pt}\ifnumequal{\rownum}{1}{\bfseries\color{white}}}m{#1}}
\newcolumntype{R}[1]{>{\raggedleft\let\newline\\\arraybackslash\hspace{0pt}\ifnumequal{\rownum}{1}{\bfseries\color{white}}}m{#1}}

% Vertical spacing
\setlength\extrarowheight{3pt}

% Horizontal spacing
\RequirePackage{multicol}
\setlength{\columnsep}{1cm}

%-------------------------------------------------------
% Algorithms
%-------------------------------------------------------
\RequirePackage{algorithm}
\RequirePackage{algorithmic}%[lined,ruled,vlined,french,linesnumbered]

\counterwithin{algorithm}{chapter}
\renewcommand{\ALG@name}{Algorithm}
\renewcommand{\thealgorithm}{\thechapter.\arabic{algorithm}}

\RequirePackage{xpatch}
\xpretocmd{\algorithmic}{\let\AND\relax\let\OR\relax\let\NOT\relax}{}{}

%-------------------------------------------------------
% Theorems
%-------------------------------------------------------
\newtheorem{theorem}{Theorem}[chapter]
\newtheorem{definition}{Definition}[chapter]
\newtheorem{proof}{Proof}[chapter]
\newtheorem{remark}{Remark}[chapter]
\newtheorem{notation}{Notation}[chapter]
\newtheorem{lemme}{Lemme}[chapter]
\newtheorem{proposition}{Proposition}[chapter]

%-------------------------------------------------------
% Source codes
%-------------------------------------------------------
\RequirePackage{listings}
\RequirePackage{tcolorbox}
\tcbuselibrary{skins}

\newtcolorbox{sourcecode}[1]{
	enhanced,
	colback=primary!10,
	boxsep=0pt,left=0pt,right=0pt,top=0pt,bottom=0pt,
	colframe=white, 
	title =\ttfamily\fontsize{12pt}{12pt}\color{white}\bfseries
	{\fcolorbox{primary}{primary}{\hspace*{.15cm}#1\hspace*{.3cm}}\vspace*{-.05cm}},
	rightrule=0pt,
	leftrule=0pt,
	arc=0pt,
	overlay={
		\fill[primary!50] 
		([xshift=0pt,yshift=2pt]frame.south west)
		rectangle 
		([xshift=18pt]interior.north west);
	}
}

\lstset{
	%language=Java,
	showspaces=false,
	showtabs=false,
	breaklines=true,
	showstringspaces=false,
	breakatwhitespace=true,
	%commentstyle=\color{javacomments},
	%keywordstyle=\color{javakeywords},
	%stringstyle=\color{javastrings},
	%morecomment=[s][\color{javadoc}]{/**}{*/},
	basicstyle=\linespread{1.1}\ttfamily\small,
	tabsize=3,
	numbers=left,
	numberstyle=\bf\footnotesize\sffamily\color{white},
	numbersep=10.5pt, 
	stepnumber=1,
	backgroundcolor=\color{primary!10},
	xleftmargin=.8cm,	
%	xtopmargin=0.1cm,	
	%framexleftmargin=2.5mm,
	%	frame=l,
	%framesep=.6cm,
	%	fillcolor=\color{greenlight-uc2!80!green-uc2},
%	rulecolor=\color{greenlight-uc2!80!green-uc2}
	%moredelim=[is][\textcolor{javacomments}]{\%\%}{\%\%}
}

%--------------------------------------------------------
% Header and footer
%--------------------------------------------------------
\RequirePackage{lipsum,fancyhdr}

\def\chaptermark#1{
%	\def\chaptertitle{ch #1}
	\def\chaptertitle{#1}
}
%\renewcommand{\chaptermark}[1]{\markboth{\thechapter\ \ #1}{}}

\fancypagestyle{plain}{ % Chapter page
	\fancyhead[L]{}
	\fancyfoot[C]{}
	\fancyhead[R]{}
	\renewcommand{\headrulewidth}{0pt}	
	\fancyfoot[L]{}
	\fancyfoot[C]{}
	\fancyfoot[R]{\thepage}
}

\pagestyle{fancy} % all other pages
%\fancyhead[L]{\it\ifnum\value{chapter}>0 \chaptername~\thechapter~: \chaptertitle \fi}
\fancyhead[L]{
	\it
	\if@mainmatter
		\ifnum\value{chapter}>0 
%			\chaptername~\thechapter~: \chaptertitle 
			\chaptertitle
		\else 
		General Introduction%	\chaptertitle
		\fi
	\fi
}
\fancyhead[C]{}
\fancyhead[R]{}
\renewcommand{\headrulewidth}{1pt}
\fancyfoot[L]{}
\fancyfoot[C]{}
\fancyfoot[R]{\thepage}

%-------------------------------------------------------
% Title page
%-------------------------------------------------------
\newcommand\blankpage{%
	\null
	\thispagestyle{empty}%
	\addtocounter{page}{-1}%
	\newpage
}

\newcommand{\maketitlepage}
{
	\begin{titlingpage}
		\centering
		{\small\countryEn}\\
		{\small\ministryEn}\\
		\vspace*{.5cm}
		\includegraphics[width=1.8cm]{front/logo-uc2} \hspace{2cm}
		\includegraphics[width=1.8cm]{front/logo-ntic}	\\
		\vspace*{.3cm}
		\Large
		\textsc{\color{primaryDark}\bfseries\universityLongEn}\\
		\vspace*{.2cm}
		\normalsize
		{\facultyLongEn}\\
		\vspace*{.2cm}
		{\normalsize\department}\\
		\vspace{1.6cm}
		{\Huge\bfseries\MakeUppercase\memoirEn}\\
		\vspace{1.3cm}
		{\it\obtainEn}\\
		\vspace{.3cm}
		{\bfseries\large Option: \specialty}\\
		\vspace{1.5cm}
		--------------------------------\\
		\vspace{.8cm}
		{\LARGE\bfseries\title}\\	
		\vspace{.8cm}	
		--------------------------------\\
		\vspace{2cm}
		\normalsize
		\begin{tabular}{L{7.5cm}R{7.5cm}}
			\rowcolor{white}
			\color{black}\textbf{\studentsEn} 	& \color{black}\textbf{\supervisorsEn}\\
			\rowcolor{white}
			\studentFullnameA 					& \supervisorFullnameA\\
			\studentFullnameB \\	
                \rowcolor{white}
               % \studentFullnameC  
		\end{tabular}	
		
		\vfill
		\normalsize\session
	\end{titlingpage}
	\pagestyle{empty}
	\begin{flushright}
		\includegraphics[width=3.2cm]{front/bismi_allah8}  
	\end{flushright}
	\clearpage
}

%-------------------------------------------------------
% Abstracts
%-------------------------------------------------------
% \usepackage{scrextend} % margins

% Arabic abstract
\RequirePackage{arabtex}
\RequirePackage{utf8}
\setcode{utf8}

\newenvironment{abstractAr}{
	\begin{addmargin}[1cm]{1cm}
		\vskip .35cm
		\leavevmode
		\begin{center}
			\RL{\textbf{ملخص}}
		\end{center}
		\vspace*{-.4cm}
		\begin{arabtext} 
			\begin{flushright}
			}
			{
			\end{flushright}
		\end{arabtext}
	\end{addmargin}
}

\newenvironment{keywordsAr}{
	\vspace*{-.2cm}
	\begin{addmargin}[1cm]{1cm}
		\begin{arabtext}
			\begin{flushright}
				\textbf{الكلمات المفتاحية:}	
}
{		
			\end{flushright}
		\end{arabtext}
	\end{addmargin}
}

% English abstract
\newenvironment{abstractEn}{
	\begin{addmargin}[1cm]{1cm}
		\vskip .35cm
		\leavevmode
		\begin{center}
			\textbf{Abstract}
		\end{center}
		\vspace*{-.6cm}
		\begin{flushleft}
}
{
		\end{flushleft}
	\end{addmargin}
}

\newenvironment{keywordsEn}{
	\vspace*{-.2cm}
	\begin{addmargin}[1cm]{1cm}
		\begin{flushleft}
			\textbf{Keywords:}	
}
{		
		\end{flushleft}
	\end{addmargin}
}

% English abstract
\newenvironment{abstractFr}{
	\begin{addmargin}[1cm]{1cm}
		\vskip .35cm
		\leavevmode
		\begin{center}
			\textbf{R\'{e}sum\'{e}}
		\end{center}
		\vspace*{-.6cm}
		\begin{flushleft}
		}
		{
		\end{flushleft}
	\end{addmargin}
}

\newenvironment{keywordsFr}{
	\vspace*{-.2cm}
	\begin{addmargin}[1cm]{1cm}
		\begin{flushleft}
			\textbf{Mots clés~:}	
		}
		{		
		\end{flushleft}
	\end{addmargin}
}

%-------------------------------------------------------
% Table of contents
%-------------------------------------------------------
\makeatletter
%\renewcommand{\contentsname}{Table of Contents}
\renewcommand\tableofcontents{
	\chapter*{Table of Contents}
	\addcontentsline{toc}{chapter}{Table of Contents}
%	\chapter*{\contentsname}
	\@starttoc{toc}
}
\makeatother
\setcounter{tocdepth}{2} % level 2 in toc

\makeatletter
\g@addto@macro\tableofcontents{\clearpage}
\makeatother

\makeatletter
\g@addto@macro\listoffigures{\clearpage}
\makeatother


\makeatletter
\g@addto@macro\listoftables{\clearpage}
\makeatother

\renewcommand\listalgorithmname{List of Algorithms}

\makeatletter
\g@addto@macro\listofalgorithms{\addcontentsline{toc}{chapter}{\listalgorithmname}\clearpage}
\makeatother

%-------------------------------------------------------
% Memoir chapter style
%-------------------------------------------------------
%\chapterstyle{culver}
%\chapterstyle{veelo}
%\chapterstyle{chappell}
%\chapterstyle{dash}
%\chapterstyle{ger}

\RequirePackage{color,calc}

\newsavebox{\ChpNumBox}

\makeatletter

\newcommand*{\thickhrulefill}{%
	\leavevmode\leaders\hrule height 1\p@ \hfill \kern \z@
}

\newcommand*\BuildChpNum[2]{
	\begin{tabular}[t]{@{}c@{}}
		\rowcolor{white}
		\makebox[0pt][c]{#1\strut} \\[.5ex]
		\rowcolor{white}
		\colorbox{primary}{
			\rule[-8em]{0pt}{0pt}%
			\rule{1.3ex}{0pt}
			\rule[2.2em]{0pt}{0pt}%
			\color{white}#2\strut
			\rule{.33ex}{0pt}
		}
	\end{tabular}
}

\makechapterstyle{BlueBox}{%
	\renewcommand{\chapnamefont}{\large\scshape}
	\renewcommand{\chapnumfont}{\Huge\bfseries}
	\renewcommand{\chaptitlefont}{\raggedright\huge\bfseries}
	\setlength{\beforechapskip}{10pt}
	\setlength{\midchapskip}{26pt}
	\setlength{\afterchapskip}{30pt}
	\renewcommand{\printchaptername}{}
	\renewcommand{\chapternamenum}{}
	\renewcommand{\printchapternum}{%
		\sbox{\ChpNumBox}{%
			\BuildChpNum{\chapnamefont\@chapapp}{\chapnumfont\thechapter}
		}
	}
	\renewcommand{\printchapternonum}{%
		\sbox{\ChpNumBox}{%
			\BuildChpNum{\chapnamefont\vphantom{\@chapapp}}{\chapnumfont\hphantom{\thechapter}}
		}
	}
	\renewcommand{\afterchapternum}{}
	\renewcommand{\printchaptertitle}[1]{%
		\parbox[t]{\hsize-\wd\ChpNumBox-.7em}{%
			\vspace{\midchapskip}%
			\thickhrulefill\par
			\chaptitlefont 
			\raggedleft ##1\par
		}
		\hfill
		\usebox{\ChpNumBox}
		\hspace*{-.4cm}
	}%
}
\chapterstyle{BlueBox}

%-------------------------------------------------------
% Bibliography
%-------------------------------------------------------
\RequirePackage[square, sort, numbers]{natbib}

% todo change name
%\renewcommand{\bibname}{Références} 

%-------------------------------------------------------
% Other
%-------------------------------------------------------
