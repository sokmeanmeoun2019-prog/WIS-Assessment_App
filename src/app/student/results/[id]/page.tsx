"use client"
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, FileText, Download } from 'lucide-react'
import 'katex/dist/katex.min.css'

const renderReadOnlyMath = (html: string | undefined) => {
  if (!html) return ''
  let cleaned = html.replace(/<math-field/g, '<math-field read-only')
  
  // 1. Remove <br> that are immediately before a closing block tag (common contentEditable quirk)
  cleaned = cleaned.replace(/<br\s*\/?>\s*(?=<\/(div|p)>)/gi, '')
  
  // 2. Clean up empty lines and breaks at the very beginning or end, even if they have attributes
  cleaned = cleaned.replace(/^(<br\s*\/?>|<div[^>]*>\s*<\/div>|<p[^>]*>\s*<\/p>|\s|&nbsp;)+/gi, '')
  cleaned = cleaned.replace(/(<br\s*\/?>|<div[^>]*>\s*<\/div>|<p[^>]*>\s*<\/p>|\s|&nbsp;)+$/gi, '')
  
  return cleaned
}

export default function StudentReviewPage() {
  const params = useParams()
  const router = useRouter()
  const subId = params.id as string

  const [submission, setSubmission] = useState<any>(null)
  const [assessment, setAssessment] = useState<any>(null)

  useEffect(() => {
    try {
      const storedSubs = JSON.parse(localStorage.getItem('demo_submissions') || '[]')
      const sub = storedSubs.find((s: any) => s.id === subId)
      if (sub) {
        setSubmission(sub)
        const storedAssessments = JSON.parse(localStorage.getItem('demo_assessments') || '[]')
        const asm = storedAssessments.find((a: any) => a.id === sub.assessmentId)
        if (asm) setAssessment(asm)
      }
    } catch (e) {}
  }, [subId])

  if (!submission || !assessment) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <p className="text-slate-500">Loading your graded paper...</p>
      </div>
    )
  }

  if (submission.status === 'Needs Grading' || submission.score === undefined) {
    return (
      <div className="max-w-4xl mx-auto pb-24 pt-12 flex flex-col items-center justify-center">
        <button onClick={() => router.back()} className="mb-6 self-start flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Results
        </button>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center max-w-md">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Pending Review</h2>
          <p className="text-slate-500">This paper is currently being graded by your teacher. Your results and corrections will appear here once published.</p>
        </div>
      </div>
    )
  }

  const headerFormat = assessment.headerFormat || {
    date: new Date().toLocaleDateString(),
    grade: assessment.grade || 'Unknown',
    subject: 'Physics',
    duration: `${assessment.timeLimitMinutes || 0} mins`,
    note: assessment.instructions || 'Calculator is NOT allowed during the quiz.',
    campus: 'Stadium, #20, St. 598C, Phnom Penh Thmey, Sen Sok',
    maxScore: assessment.questions?.reduce((sum: number, q: any) => q.type === 'SECTION_BREAK' ? sum : sum + (Number(q.points) || 1), 0).toString(),
    quizId: assessment.title || 'Quiz'
  }

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <button 
        onClick={() => router.back()}
        className="mb-6 flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Results
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="bg-indigo-600 p-8 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{submission.assessmentTitle}</h1>
            <p className="text-indigo-100 opacity-90">Completed by {submission.studentName}</p>
          </div>
          <div className="bg-white/20 px-6 py-4 rounded-xl text-center backdrop-blur-sm">
            <p className="text-indigo-100 text-sm font-semibold uppercase tracking-wider mb-1">Final Score</p>
            <div className="text-4xl font-black">{submission.score}%</div>
          </div>
        </div>

        {/* Official Document Header (Paper Layout) */}
        <div className="bg-white rounded-none p-8 font-serif text-black relative select-none border-b-2 border-slate-200">
          <div className="absolute top-2 right-4 text-xs text-slate-400 font-sans italic">Official Paper Header Format</div>
          
          <div className="flex justify-between items-start mt-4">
            <div className="space-y-3 text-[15px] flex-1 max-w-md">
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Date:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.date}</span>
              </div>
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Student's name:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{submission.studentName}</span>
              </div>
              <div className="flex items-end">
                <span className="font-bold mr-2 whitespace-nowrap">Grade:</span>
                <span className="border-b-[1.5px] border-dotted border-black w-32 outline-none bg-transparent text-center">{headerFormat.grade}</span>
                <span className="font-bold mx-2 whitespace-nowrap">Subject:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1 min-w-0">{headerFormat.subject}</span>
              </div>
              <div className="flex items-end">
                <span className="font-bold mr-2">Duration:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.duration}</span>
              </div>
              <div className="flex items-end">
                <span className="font-bold mr-2">Note:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.note}</span>
              </div>
              <div className="flex items-end">
                <span className="font-bold mr-2">Campus:</span>
                <span className="border-b-[1.5px] border-dotted border-black flex-1 outline-none bg-transparent px-1">{headerFormat.campus}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-start px-4">
              <img src="https://static.wixstatic.com/media/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png/v1/fill/w_200,h_200,al_c/3e2458_2ade346f009846cca13b37725a66d80f~mv2.png" alt="WIS" className="w-28 h-28 object-contain mb-1" />
              <div className="text-center text-[11px] font-bold text-black tracking-tight leading-tight">សាលាអន្តរជាតិវេស្ទើន</div>
            </div>

            <div className="flex flex-col items-center justify-start w-32 pt-2">
              <span className="font-bold mb-2">Total Score</span>
              <div className="w-20 h-20 rounded-full border-2 border-black flex flex-col relative overflow-hidden">
                <div className="flex-1 border-b-2 border-black flex items-center justify-center">
                  <span className="font-bold text-lg">{submission.score}%</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-white">
                  <span className="w-full text-center outline-none bg-transparent font-serif text-lg">{headerFormat.maxScore}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t-[3px] border-dashed border-black w-full mt-6 mb-2"></div>
          <div className="text-center w-full flex justify-center">
            <span className="font-bold underline text-center outline-none bg-transparent text-lg font-serif min-w-[150px]">{headerFormat.quizId}</span>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-200 pb-3 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2 text-green-600" /> 
            Graded Answers
          </h3>

          <div className="space-y-8">
            {(() => {
              let qNumCounter = 1;
              return assessment.questions?.map((q: any, index: number) => {
                if (q.type === 'SECTION_BREAK') {
                  return (
                    <div key={q.id} className="flex items-center justify-center pt-8 pb-4">
                      <div className="h-px bg-indigo-200 flex-1"></div>
                      <div className="px-5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm uppercase tracking-wider rounded-full mx-4 shadow-sm">
                        {q.content || 'New Section'}
                      </div>
                      <div className="h-px bg-indigo-200 flex-1"></div>
                    </div>
                  )
                }

                const currentQNum = qNumCounter++;
                const studentAnswer = submission.answers?.[q.id]
                
                // Simplistic correct check for UI
                let isCorrect = false
                if (q.type === 'MCQ') isCorrect = studentAnswer === q.correctAnswer
                else if (q.type === 'FILL_IN_BLANK') {
                  isCorrect = studentAnswer?.trim().toLowerCase().replace(/\s+/g, '') === q.correctAnswer?.trim().toLowerCase().replace(/\s+/g, '')
                }

                return (
                  <React.Fragment key={q.id}>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center justify-between">
                      <span>Question {currentQNum}</span>
                    <span className="text-sm font-medium px-2 py-1 bg-white rounded border text-slate-500">
                      Out of {q.points || 1} pts
                    </span>
                  </h4>
                  
                  <div className="prose max-w-none text-slate-700 text-sm mb-5" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.content) || '<em>No question text</em>' }} />
                  
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                    {/* MCQ */}
                    {q.type === 'MCQ' && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">You Selected:</p>
                        {studentAnswer ? (
                          <div className={`font-medium flex items-center gap-2 ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                            <span className="text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.options?.find((o:any) => o.id === studentAnswer)?.text || 'Unknown') }} />
                            <span>{isCorrect ? ' (Correct)' : ' (Incorrect)'}</span>
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">Left blank</div>
                        )}
                        {!isCorrect && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-green-700 font-medium flex items-center gap-2">
                            <span>Correct Answer:</span>
                            <span className="text-justify [&>*]:m-0" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.options?.find((o:any) => o.id === q.correctAnswer)?.text) }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* FILL IN THE BLANK */}
                    {q.type === 'FILL_IN_BLANK' && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">You Typed:</p>
                        <div className={`font-medium flex items-center ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                           {studentAnswer ? <span dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentAnswer) }} /> : <span className="text-slate-400 italic">Left blank</span>}
                           {studentAnswer && <span className="ml-2">{isCorrect ? ' (Correct)' : ' (Incorrect)'}</span>}
                        </div>
                        {!isCorrect && q.correctAnswer && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-green-700 font-medium flex items-center">
                            <span className="mr-2">Correct Answer:</span>
                            <span dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(q.correctAnswer) }} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* SHORT ANSWER / PHYSICS */}
                    {(q.type === 'SHORT_ANSWER' || q.type === 'PHYSICS_CALCULATION') && (
                      <div>
                         <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Your Solution:</p>
                         {studentAnswer?.text ? (
                           <div className="prose max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentAnswer.text) }} />
                         ) : (
                           <div className="text-slate-400 italic">No typed solution provided.</div>
                         )}
                         {studentAnswer?.image && (
                           <div className="mt-4">
                             <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">Your Worksheet (with Teacher's marks):</p>
                             <div className="bg-white p-2 rounded-lg border border-slate-200 inline-block max-w-full overflow-hidden">
                               <img src={studentAnswer.image} alt="Graded Worksheet" className="max-w-full max-h-96 object-contain rounded-md" />
                             </div>
                           </div>
                         )}
                         <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-indigo-600 font-medium italic">
                           Note: Typed solutions and worksheets are graded manually by your teacher.
                         </div>
                      </div>
                    )}

                    {/* MATCHING */}
                    {q.type === 'MATCHING' && (
                      <div>
                        <p className="text-xs text-slate-500 mb-3 uppercase font-bold tracking-wider">Your Matches:</p>
                        <div className="space-y-2">
                          {q.pairs?.map((pair: any) => {
                            const studentMatchedWith = studentAnswer?.[pair.id]
                            const isPairCorrect = studentMatchedWith === pair.right
                            return (
                              <div key={pair.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                                <div className="font-semibold text-slate-700 w-1/3" dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(pair.left) }} />
                                <div className="text-slate-400 hidden sm:block">→</div>
                                <div className={`w-1/3 flex justify-center font-medium ${isPairCorrect ? 'text-green-700' : 'text-red-600'}`}>
                                  {studentMatchedWith ? (
                                    <div dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(studentMatchedWith) }} />
                                  ) : (
                                    <span className="italic text-slate-400">Not selected</span>
                                  )}
                                </div>
                                <div className="text-slate-400 hidden sm:block">|</div>
                                <div className="w-1/3 text-right text-xs text-slate-500 flex flex-col items-end">
                                  <span className="block font-semibold">Correct:</span>
                                  <div dangerouslySetInnerHTML={{ __html: renderReadOnlyMath(pair.right) }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
                </React.Fragment>
              )
            })})()}
          </div>

        </div>
      </div>
    </div>
  )
}
