export function getBashCompletionScript(): string {
  return `# bash completion for qix
_qix_completion() {
  local cur cmd scripts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "add completion help info link list ls run" -- "$cur") )
    return 0
  fi

  cmd="\${COMP_WORDS[1]}"

  case "$cmd" in
    run|info)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        scripts="$(qix list 2>/dev/null)"
        COMPREPLY=( $(compgen -W "$scripts" -- "$cur") )
      fi
      ;;
    add|link)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        COMPREPLY=( $(compgen -f -- "$cur") )
      fi
      ;;
  esac
}

complete -F _qix_completion qix
`;
}
