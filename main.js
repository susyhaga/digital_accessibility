document.addEventListener('DOMContentLoaded', function () {


    //para ver se o nav suporta a api speechSynthesis
    if ('speechSynthesis' in window) {
        console.log('A API speechSynthesis é suportada neste navegador.');
    } else {
        console.log('A API speechSynthesis não é suportada neste navegador.');
    }

    // Seleção de elementos do DOM
    const selectLangElement = document.getElementById('select_lang');
    const hoverTitleText = document.getElementById('hoverTitleText');
    const hoverSubTitle = document.getElementById('sub_title');
    const selectFile = document.getElementById('select_pdf');
    const hoverTextArea = document.getElementById('hoverTextArea');
    const buttonPlay = document.getElementById('buttonPlay');
    const buttonStop = document.getElementById('buttonStop');
    const buttonContinue = document.getElementById('buttonContinue');
    const langSelect = document.getElementById('lang_select');
    const ptAudio = document.getElementById('pt_audio');
    const enAudio = document.getElementById('en_audio');
    const fileNameContainer = document.getElementById('fileNameContainer');
    const fileInput = document.getElementById('fileInput');
    const availableFilesContainer = document.getElementById('availableFilesContainer');

    // Variáveis para controle do discurso
    let isPaused = false;
    let isSpeaking = false;
    let isTextAreaReading = false;
    let isPdfReading = false;
    let currentTextChunks = [];
    let resumeIndex = 0;
    let pdfContent = '';
    let typedWord = '';


    speakText('Welcome to Digital accessibility. Here you can listen to all the text type. Select a language: P for Portuguese and E for English. Then, press "L" to load a text. And press "ENTER" to listen, "S" to stop and "C" to go on. Enjoy it!', 'en-US');

    //FUNCOES GLOBAIS

    // Torne a função acessível globalmente
    window.selectTextFiles = selectTextFiles;
    // Função para cancelar a leitura

    window.resetSpeech = function () {
        isPaused = false;
        isSpeaking = false;
        isTextAreaReading = false;
        isPdfReading = false;
        currentTextChunks = [];
        resumeIndex = 0;
        window.speechSynthesis.cancel();
    }

    // Função global para iniciar a leitura do texto
    window.listen = function (text) {
        if (text.trim() !== '') {
            if (!isTextAreaReading) {
                const lang = langSelect.value;
                resetSpeech();
                isPaused = false;
                speakText(text, lang);
            }
        } else {
            console.log('Nenhum texto para ler.');
        }
    };

    // Função para pausar a fala
    window.pause = function () {
        if (isSpeaking) {
            isPaused = true;
            window.speechSynthesis.pause();
        }
    };
    // Função para retomar a leitura do texto do textarea ou do PDF
    window.resumeSpeech = function () {
        if (isPaused) {
            window.speechSynthesis.resume(); // Resumir a síntese de fala do navegador
            isPaused = false; // Atualiza o estado de pausa para falso
        } else if (isTextAreaReading) {
            console.log('Resuming text from textarea.');
            speakText(hoverTextArea.value.trim(), langSelect.value); // Fala o texto do textarea novamente
        } else if (isPdfReading) {
            console.log('Resuming PDF reading.');
            window.speechSynthesis.resume(); // Resumir a síntese de fala do navegador
        }
    };

    //PARTE DAS teclas
    // Função para processar a ação de 'Enter' no textarea
    function handleEnterKey() {
        const text = hoverTextArea.value.trim();
    
        if (text !== '') {
            resetSpeech(); // Cancela a leitura atual se estiver ocorrendo
            isPaused = false;
            speakText(text, langSelect.value);
            isTextAreaReading = true; // Define que está lendo texto do textarea
        } else if (pdfFile) {
            resetSpeech(); // Cancela a leitura atual se estiver ocorrendo
            isPaused = false;
            isPdfReading = true;
            readPdfContent(pdfFile);
        } else {
            console.log('Nenhum texto para ler.');
        }
    }

    // Função para processar a ação de 'S' em qualquer contexto
    function handleSKey() {
        if (isSpeaking) {
            window.pause(); // Pausa a leitura atual
        } else if (isPaused && (isTextAreaReading || isPdfReading)) {
            window.resumeSpeech(); // Retoma a leitura quando S é pressionado
        }
    }

    // Função para processar a ação de 'C' em qualquer contexto
    function handleCKey() {
        if (isPaused && (!isTextAreaReading || !isPdfReading)) {
            window.resumeSpeech(); // Retoma a leitura quando C é pressionado
        }
    }

   // Função para falar o nome da língua selecionada
function speakLanguageName(lang) {
    const languageNames = {
        'pt-BR': 'Português',
        'en-US': 'English'
    };
    const langName = languageNames[lang];
    if (langName) {
        speakText(langName, lang);
    } else {
        console.log('Linguagem não suportada:', lang);
    }
}


    // Evento ao pressionar teclas no hoverTextArea
    document.addEventListener('keydown', function (event) {
        const key = event.key.toLowerCase(); // Converte a tecla para minúsculas
        if (key === 'arrowup' || key === 'arrowdown') {
            event.preventDefault();
            const file = fileInput.files[0];
            if (file) {
                readFile(file);
            }
        }
        if (key === 'enter') {
            event.preventDefault();
            const text = hoverTextArea.value.trim() || 'Default text if textarea is empty.';
            listen(text);
            if (pdfFile) {
                resetSpeech();
                isPaused = false;
                isPdfReading = true;
                readPdfContent(pdfFile);
            }
        } else if (key === 's') {
            event.preventDefault();
            handleSKey();
        } else if (key === 'c') {
            event.preventDefault();
            handleCKey();
        } else if (key === 'l') {
            event.preventDefault();
            fileInput.click(); // Abre a janela de seleção de arquivos
        } else if (key === 'p') {
            event.preventDefault();
            langSelect.value = 'pt-BR'; // Define o valor do select como português brasileiro
            speakLanguageName('pt-BR');
        } else if (key === 'e') {
            event.preventDefault();
            langSelect.value = 'en-US'; // Define o valor do select como inglês americano
            speakLanguageName('en-US');
        } else if (key >= 'a' && key <= 'z') {
            typedWord += key;
        }
    });

    // Função para falar o texto
    function speakText(text, lang, onEndCallback) {
        // Verifica se já está falando
        if (isSpeaking) {
            return;
        }

        // Se estiver pausado, redefine o índice de resumo
        if (isPaused) {
            resumeIndex = 0;
        }
        const words = text.split(' ');
        const textChunks = [];
        let currentChunk = '';
        const CHUNK_SIZE = 200;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if ((currentChunk + word).length <= CHUNK_SIZE) {
                currentChunk += word + ' ';
            } else {
                textChunks.push(currentChunk.trim());
                currentChunk = word + ' ';
            }
        }
        if (currentChunk !== '') {
            textChunks.push(currentChunk.trim());
        }
        currentTextChunks = textChunks;

        function speakNextChunk(startIndex = 0) {
            if (isPaused) return;
            for (let i = startIndex; i < currentTextChunks.length; i++) {
                const utterance = new SpeechSynthesisUtterance(currentTextChunks[i]);
                utterance.lang = lang;
                utterance.volume = 1;
                utterance.rate = 1;
                utterance.pitch = 1;

                if (i === startIndex) {
                    utterance.onstart = () => {
                        isSpeaking = true;
                    };
                }

                if (i === currentTextChunks.length - 1) {
                    utterance.onend = () => {
                        isSpeaking = false;
                        resetSpeech();
                        if (onEndCallback) {
                            onEndCallback();
                        }
                    };
                }
                if (isPaused) {
                    resumeIndex = i + 1;
                    window.speechSynthesis.resume();
                }
                window.speechSynthesis.speak(utterance);
            }
        }
        speakNextChunk(resumeIndex);
    }
    speakText('Welcome to Digital accessibility. Here you can listen to all the text type. Select a language: P for Portuguese and E for English. Then, press "L" to load a text. And press "ENTER" to listen, "S" to stop and "C" to go on. Enjoy it!', 'en-US');

    //PARTE DO PDF
    //Funcao para abrir a aba OPEN FILE com um click
    function selectTextFiles() {
        fileInput.click();
    }

    // Função para ler o arquivo selecionado e falar o conteúdo
    function readFile(file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const content = event.target.result;
            speakText(content);
        };
        reader.readAsText(file);
    }

    // Evento ao mudar o arquivo selecionado no input file
    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            resetSpeech(); // Cancela qualquer leitura atual
            resetPdfContent(); // Limpa o conteúdo do PDF atual

            fileNameContainer.textContent = file.name; // Mostra o nome do novo arquivo
            readPdfContent(file); // Lê e processa o novo arquivo PDF
        } else {
            pdfFile = null; // Limpa o arquivo PDF atual
            fileNameContainer.textContent = 'No file chosen';
            resetPdfContent(); // Limpa o conteúdo do PDF atual
            resetSpeech(); // Cancela qualquer leitura atual
        }
    });
    // Limpar conteúdo do PDF
    function resetPdfContent() {
        pdfContent = '';
    }

    // Função para ler e processar o conteúdo do PDF selecionado
    function readPdfContent(file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const arrayBuffer = event.target.result;
            pdfjsLib.getDocument(arrayBuffer).promise.then(async function (pdf) {
                const numPages = pdf.numPages;
                pdfContent = ''; // Limpa o conteúdo anterior do PDF

                for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    pdfContent += pageText + ' ';
                }

                isPdfReading = true; // Indica que está lendo PDF em voz alta
                // Falar o nome do arquivo antes de falar o conteúdo do PDF
                speakText(file.name, langSelect.value, function () {
                    // Após falar o nome do arquivo, falar o conteúdo do PDF
                    speakPdfContent(pdfContent.trim(), langSelect.value, function () {
                        console.log('Leitura do PDF concluída.');
                    });
                });

            }).catch(function (reason) {
                console.error('Error loading PDF:', reason);
            });
        };
        reader.readAsArrayBuffer(file);
    }

    // Função para falar o conteúdo do PDF
    function speakPdfContent(text, lang, onEndCallback) {
        if (isSpeaking) return;
        if (isPaused) {
            resumeIndex = 0;
        }
        const words = text.split(' ');
        const textChunks = [];
        let currentChunk = '';
        const CHUNK_SIZE = 200;
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if ((currentChunk + word).length <= CHUNK_SIZE) {
                currentChunk += word + ' ';
            } else {
                textChunks.push(currentChunk.trim());
                currentChunk = word + ' ';
            }
        }
        if (currentChunk !== '') {
            textChunks.push(currentChunk.trim());
        }
        currentTextChunks = textChunks;
        function speakNextChunk(startIndex = 0) {
            if (isPaused) return;
            for (let i = startIndex; i < currentTextChunks.length; i++) {
                const utterance = new SpeechSynthesisUtterance(currentTextChunks[i]);
                utterance.lang = lang;
                utterance.volume = 1;
                utterance.rate = 1;
                utterance.pitch = 1;
                if (i === startIndex) {
                    utterance.onstart = () => {
                        isSpeaking = true;
                    };
                }
                if (i === currentTextChunks.length - 1) {
                    utterance.onend = () => {
                        isSpeaking = false;
                        resetSpeech();
                        if (onEndCallback) {
                            onEndCallback();
                        }
                    };
                }
                if (isPaused) {
                    resumeIndex = i + 1;
                    window.speechSynthesis.resume();
                }
                window.speechSynthesis.speak(utterance);
            }
        }
        speakNextChunk(resumeIndex);
    }

    // Evento ao pressionar o botão de Play
    
    buttonPlay.addEventListener('click', function () {
        let text = '';
        if (isPdfReading) {
            text = fileNameContainer.textContent.trim();
        } else {
            text = hoverTextArea.value.trim();
        }
        if (text !== '') {
            window.resetSpeech();
            isPaused = false;
            isTextAreaReading = true;
            speakText(text, langSelect.value);
        }
    });

    // Evento ao pressionar o botão de Stop
    buttonStop.addEventListener('click', function () {
        if (isSpeaking || !isPaused) {
            window.pause();
        }
    });

    // Evento ao pressionar o botão de Continue
    buttonContinue.addEventListener('click', function () {
        console.log('Botão "Continue" clicado.'); // Debugging: Verifica se o evento de clique está sendo detectado
        if (isPaused) {
            console.log('Resumindo a leitura.'); // Debugging: Verifica se está chamando resumeSpeech() corretamente
            resumeSpeech(); // Chama a função para retomar a leitura
        }
    });

    // Função para lidar com mouseenter
    function handleMouseEnter(element, text, lang) {
        element.addEventListener('mouseenter', function () {
            if (!isSpeaking && !isPdfReading) {
                // Fala o texto diretamente
                speakText(text, lang);
            } else {
                console.log('Não foi possível falar o texto. A síntese de fala já está em andamento ou pausada.');
            }
        });
    }

    
// Função para cancelar a fala quando o usuário sai do elemento
function cancelSpeechOnMouseLeave(element) {
    element.addEventListener('mouseleave', function () {
        // Verifica se está lendo texto do textarea
        if (isTextAreaReading && element === hoverTextArea) {
            return; // Não cancela se estiver lendo o textarea e é o hoverTextArea
        }
        // Verifica se está lendo PDF
        if (isPdfReading && element === fileNameContainer) {
            return; // Não cancela se estiver lendo o PDF e é o fileNameContainer
        }
        // Se não estiver lendo nada, cancela a fala
        if (!isSpeaking && !isPdfReading) {
            resetSpeech();
        }
    });
}

    // Chamadas para inicializar os eventos de mouseenter
    handleMouseEnter(hoverTitleText, 'Digital accessibility. First, select a language: "P" for Portuguese and "E" for English. Then, press "L" to load a text. AND: press "ENTER" to listen, "S" to stop and "C" to go on', 'en-US');
    handleMouseEnter(buttonPlay, 'Play audio', 'en-US');
    handleMouseEnter(buttonStop, 'Pause audio', 'en-US');
    handleMouseEnter(buttonContinue, 'Continue audio', 'en-US');
    handleMouseEnter(ptAudio, 'Português', 'pt-BR');
    handleMouseEnter(enAudio, 'English', 'en-US');
    handleMouseEnter(hoverSubTitle, 'Type or paste a text down below. Or, download a file just pressing "L" to be read', 'en-US'); // Adicionei 'en-US' como parâmetro
    handleMouseEnter(selectFile, 'Choose your file pressing "L"', 'en-US');
    handleMouseEnter(fileNameContainer, 'No file chosen', 'en-US');

    // Aplicando a função de cancelamento de fala aos elementos não relacionados ao PDF
    cancelSpeechOnMouseLeave(hoverTitleText);
    cancelSpeechOnMouseLeave(hoverSubTitle);
    cancelSpeechOnMouseLeave(selectFile);
    cancelSpeechOnMouseLeave(buttonPlay);
    cancelSpeechOnMouseLeave(buttonStop);
    cancelSpeechOnMouseLeave(buttonContinue);
    cancelSpeechOnMouseLeave(ptAudio);
    cancelSpeechOnMouseLeave(enAudio);
    cancelSpeechOnMouseLeave(fileInput);
    cancelSpeechOnMouseLeave(fileNameContainer);
});