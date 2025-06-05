import dotenv from 'dotenv';
import pool from '../config/db.js';

dotenv.config();

export const FetchAllStudent=async(req,res)=>{
  const {studentclass}=req.body;
  console.log("The teachers class is",studentclass);

  if(!studentclass){
    return res.status(400).json({message:"Parameter class is required"})
  }

  try {
    const response=await pool.query("SELECT * FROM users WHERE class=$1",[studentclass]);
    if (response.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(response.rows);
    res.status(200).json({result: response.rows}); 

  } catch (error) {
    console.error("Internal server error", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
  
};

export const UploadResult=async(req,res)=>{
    const {class_name,teacher_id,subject,results}=req.body;// expecitng an array of result objects
    console.log(req.body);
    
     //basic validation
     if(!class_name || !subject ||!teacher_id || !Array.isArray(results)){
        return res.status(400).json({ message:"incomplete or invalid data."});
    }
    try {
        //Prepare placeholders and values for bulk insert
        const placeholders=[];
        const values=[];

        results.forEach((result,index)=>{
            //extract fields from each result
            const {
                student_id,
                test_score,
                exam_score,
                grade,
                comment,
                term,
                session,
                totalscore
            }= result;

            const startIndex=index * 11  + 1;  

            placeholders.push(`($${startIndex}, $${startIndex + 1}, $${startIndex +2}, $${startIndex +3}, $${startIndex +4}, $${startIndex+5}, $${startIndex+6},$${startIndex+7}, $${startIndex + 8}, $${startIndex + 9}, $${startIndex + 10})`);

            values.push(
                student_id,
                teacher_id,
                class_name,
                subject,
                test_score,
                exam_score,
                grade,
                comment,
                term,
                session,
                totalscore
            )
           

          

        });

        //construct the sql query with placeholders
        const query=`INSERT INTO results (
        student_id,
        teacher_id,
        class_name,
        subject,
        test_score,
        exam_score,
        grade,
        comment,
        term,
        session,
        totalscore
        ) VALUES ${placeholders.join(', ')}
         RETURNING *;`

         const inserted=await pool.query(query,values);

         res.status(201).json({
            message:"results uploaded successfully",
            results: inserted.rows
         });
            
        
    } catch (error) {
        console.error("Upload error:", error.message);
        res.status(500).json({message:"server error" });
        
    }
}

export const FetchStudentResult=async(req,res)=>{
    const teacherId=req.query.teacherId;
    const className=req.query.className;
    const subject=req.query.subject
    

    console.log("The teacher ID is:",teacherId);
    console.log("The classname and subject are:",className,subject);
    if(!teacherId || !className || !subject) return res.status(400).json({message:"Teacher ID or Subject or Class not available"})
    try {
        const result=await pool.query(
                        `SELECT r.*,
            s.name AS student_name,
            t.name AS teacher_name
        FROM results r
        JOIN users s ON r.student_id=s.id
        JOIN users t ON r.teacher_id=t.id
        WHERE r.teacher_id=$1 AND r.class_name=$2 AND r.subject=$3`,
        [teacherId,className,subject]
        );
        console.log("The results are ",result.rows)
        res.status(200).json({results:result.rows})
    } catch (error) {
        console.error("Error fetching student results:", error.message);
        res.status(500).json({ message:"Server Error"})
    }
}

export const SaveSingleResult=async(req,res)=>{
  const {class_name,subject,teacher_id,result}=req.body;

  console.log(req.body);
  

    if (!class_name || !subject || !teacher_id || !result) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

    const {
    student_id,
    test_score,
    exam_score,
    grade,
    comment,
    term,
    session,
    totalscore,
  } = result;

  const parsedExam=parseInt(exam_score);

  try {
    const updatedQuery=`
    UPDATE results SET
    test_score=$1,
    exam_score=$2,
    grade=$3,
    comment=$4,
    totalscore=$5,
    teacher_id=$6
    WHERE
    student_id=$7
    AND class_name=$8
    AND subject=$9
    RETURNING *;
    `;
console.log('Update values:', {
  test_score,
  parsedExam,
  grade,
  comment,
  totalscore,
  teacher_id,
  student_id,
  class_name,
  subject,
  term,
  session,
});



    const values=[
      test_score,
      parsedExam,
      grade,
      comment,
      totalscore,
      teacher_id,
      student_id,
      class_name,
      subject,
    ];

    const resultUpdate=await pool.query(updatedQuery,values);
    console.log(resultUpdate);
    

    if(resultUpdate.rowCount ===0){
      return res.status(400).json({message:"Result not found"})
    }

    return res.status(200).json({message:"Result updated successfully",data: resultUpdate.rows[0]});
  } catch (error) {
    console.error('Error updating result:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export const ApprovalCount=async(req,res)=>{
  const {teacherId,session,term}=req.query;
  console.log(req.query);
  

  if(!teacherId || !session || !term) return res.status(400).json({message:"Teacher ID, term and session are required"});

  try {
    const queryData=`
    SELECT
    COUNT(*) FILTER (WHERE approved= true ) AS approved_count,
    COUNT(*) FILTER (WHERE approved= false) AS unapproved_count
    FROM results
    WHERE session=$1 AND term=$2 AND teacher_id=$3
    `;

    const values=[session,term,teacherId];
    const {rows}=await pool.query(queryData, values);
    console.log(rows);
    
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error(`Error fetching approval counts:`,error);
    res.status(500).json({error:"Internal Server Error"});
  }
}