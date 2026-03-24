export function getBashCompletionScript(): string {
  return `# bash completion for qix
_qix_completion() {
  local cur cmd subcmd scripts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "add completion cron help info link list ls run" -- "$cur") )
    return 0
  fi

  cmd="\${COMP_WORDS[1]}"
  subcmd="\${COMP_WORDS[2]}"

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
    cron)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "add remove list" -- "$cur") )
        return 0
      fi
      case "$subcmd" in
        add)
          if [[ \${COMP_CWORD} -eq 3 ]]; then
            scripts="$(qix list 2>/dev/null)"
            COMPREPLY=( $(compgen -W "$scripts" -- "$cur") )
          fi
          ;;
        remove)
          if [[ \${COMP_CWORD} -eq 3 ]]; then
            scripts="$(qix list 2>/dev/null)"
            COMPREPLY=( $(compgen -W "$scripts" -- "$cur") )
          fi
          ;;
        list)
          COMPREPLY=( $(compgen -W "--name --json" -- "$cur") )
          ;;
      esac
      ;;
  esac
}

complete -F _qix_completion qix
`;
}
