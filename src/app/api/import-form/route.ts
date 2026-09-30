import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url || !url.includes('docs.google.com/forms')) {
      return NextResponse.json({ error: 'Invalid Google Form URL.' }, { status: 400 })
    }

    let fetchUrl = url
    if (fetchUrl.includes('/edit')) {
      fetchUrl = fetchUrl.replace(/\/edit.*$/, '/viewform')
    }

    // 1. Fetch the form HTML from the server to bypass CORS
    const res = await fetch(fetchUrl)
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to access form. It may be restricted.' }, { status: 403 })
    }
    
    const html = await res.text()

    // 2. Extract the FB_PUBLIC_LOAD_DATA_ array
    const startStr = 'var FB_PUBLIC_LOAD_DATA_ = '
    const startIndex = html.indexOf(startStr)
    
    if (startIndex === -1) {
      return NextResponse.json({ error: 'Could not find form data. Please ensure the form is fully public.' }, { status: 400 })
    }

    let jsonStr = html.substring(startIndex + startStr.length)
    
    // Cut off at the end of the script tag
    const endIndex = jsonStr.indexOf('</script>')
    if (endIndex !== -1) {
      jsonStr = jsonStr.substring(0, endIndex).trim()
    }

    // Isolate the array by finding the last closing bracket and semicolon
    const lastBracket = jsonStr.lastIndexOf('];')
    if (lastBracket !== -1) {
      jsonStr = jsonStr.substring(0, lastBracket + 1)
    } else if (jsonStr.endsWith(';')) {
      jsonStr = jsonStr.slice(0, -1)
    }

    const data = JSON.parse(jsonStr)
    
    // Google Forms data structure is deeply nested and obfuscated, but predictable.
    // data[1][1] = form title
    // data[1][8] = array of form items (questions, sections, images, etc.)
    const formTitle = data[1][1] || 'Imported Assessment'
    const formItems = data[1][8] || []
    
    const questions = []
    
    for (const item of formItems) {
      const itemTitle = item[1] || ''
      const itemType = item[3] // 0=Short, 1=Paragraph, 2=MCQ, 3=Dropdown, 4=Checkboxes, 8=Section, 9=Date/Time, etc.
      
      // If it's a section break
      if (itemType === 8) {
        questions.push({
          id: 'sec_' + Math.random().toString(36).substring(7),
          type: 'SECTION_BREAK',
          content: itemTitle,
          points: 0,
          options: [],
          correctAnswer: ''
        })
        continue
      }
      
      // Only process supported question types
      if (![0, 1, 2, 3, 4].includes(itemType)) continue
      
      const questionData = item[4] && item[4][0]
      if (!questionData) continue
      
      const isRequired = questionData[2] === 1
      const optionsArray = questionData[1] || []
      
      let type = 'SHORT_ANSWER'
      const options = []
      
      if (itemType === 1) type = 'SHORT_ANSWER' // Map paragraph to short answer
      if (itemType === 2 || itemType === 3 || itemType === 4) {
        type = 'MCQ'
        optionsArray.forEach((opt: any, index: number) => {
          options.push({ id: 'opt_' + index, text: opt[0] })
        })
      }
      
      questions.push({
        id: 'q_' + Math.random().toString(36).substring(7),
        type: type,
        content: itemTitle,
        points: 1, // Google forms API doesn't expose correct answers/points in the public load data for security, default to 1
        options: options,
        correctAnswer: options.length > 0 ? options[0].id : '',
        isRequired: isRequired
      })
    }

    return NextResponse.json({ title: formTitle, questions })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
